const express = require('express');

const router = express.Router();
const { Op, fn, col, literal } = require('sequelize');
const { sequelize, Course, User, Favorite } = require('../models');
const { authenticateUser, optionalAuthenticateUser } = require('../middleware/auth-user');
const { asyncHandler } = require('../middleware/async-handler');

const DEFAULT_SORT = 'newest';
const DEFAULT_PAGE_SIZE = 12;
const MAX_PAGE_SIZE = 50;

const SORT_ORDERS = {
  newest: () => [['createdAt', 'DESC'], ['id', 'DESC']],
  title_asc: () => [[fn('lower', col('Course.title')), 'ASC'], ['id', 'ASC']]
};

const ownerAttributes = { exclude: ['password', 'createdAt', 'updatedAt'] };

const asString = (value) => (typeof value === 'string' ? value : undefined);

const toPositiveInt = (value) => {
  const str = asString(value);
  return str !== undefined && /^\d+$/.test(str.trim()) && Number(str) >= 1 ? Number(str) : null;
};

/** Validates and normalises the GET /courses query string. */
const parseCatalogQuery = (query) => {
  const errors = [];

  const q = (asString(query.q) || '').trim();

  let ownerId = null;
  if (query.ownerId !== undefined && query.ownerId !== '') {
    ownerId = toPositiveInt(query.ownerId);
    if (ownerId === null) errors.push('Invalid ownerId');
  }

  const sort = Object.prototype.hasOwnProperty.call(SORT_ORDERS, query.sort) ? query.sort : DEFAULT_SORT;
  const page = toPositiveInt(query.page) || 1;
  const pageSize = Math.min(toPositiveInt(query.pageSize) || DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);

  return { errors, q, ownerId, sort, page, pageSize };
};

// Case-insensitive "contains" match on title or description; LIKE wildcards in the input are escaped
const buildSearchCondition = (q) => {
  const escaped = q.toLowerCase().replace(/[\\%_]/g, '\\$&');
  const pattern = sequelize.escape(`%${escaped}%`);
  return literal(
    "(LOWER(`Course`.`title`) LIKE " + pattern + " ESCAPE '\\' " +
    "OR LOWER(`Course`.`description`) LIKE " + pattern + " ESCAPE '\\')"
  );
};

// Return a page of courses, with optional keyword search, owner filter and sort
router.get('/courses', asyncHandler(async (req, res) => {
  const { errors, q, ownerId, sort, page, pageSize } = parseCatalogQuery(req.query);
  if (errors.length) {
    return res.status(400).json({ errors });
  }

  const conditions = [];
  if (q) conditions.push(buildSearchCondition(q));
  if (ownerId) conditions.push({ userId: ownerId });
  const where = conditions.length ? { [Op.and]: conditions } : undefined;

  const totalCount = await Course.count({ where });
  const totalPages = Math.ceil(totalCount / pageSize);
  // A page beyond the last one falls back to the last page rather than returning an empty list
  const currentPage = totalPages ? Math.min(page, totalPages) : 1;

  const items = totalCount === 0 ? [] : await Course.findAll({
    where,
    attributes: { exclude: ['createdAt', 'updatedAt'] },
    include: { model: User, attributes: ownerAttributes },
    order: SORT_ORDERS[sort](),
    limit: pageSize,
    offset: (currentPage - 1) * pageSize
  });

  res.json({
    items,
    meta: {
      totalCount,
      page: currentPage,
      pageSize,
      totalPages,
      sortApplied: sort,
      qApplied: q || null,
      ownerIdApplied: ownerId
    }
  });
}));

// Return a specific course (with isFavorited for the signed-in user)
router.get('/courses/:id', optionalAuthenticateUser, asyncHandler(async (req, res) => {
  const course = await Course.findByPk(req.params.id, {
    attributes: { exclude: ['createdAt', 'updatedAt'] },
    include: { model: User, attributes: ownerAttributes }
  });
  if (!course) {
    return res.status(404).json({ error: 'Course Not Found' });
  }

  let isFavorited = false;
  if (req.currentUser) {
    isFavorited = !!(await Favorite.findOne({
      where: { userId: req.currentUser.id, courseId: course.id }
    }));
  }
  res.json({ ...course.toJSON(), isFavorited });
}));

// Favorite a course (idempotent)
router.post('/courses/:id/favorite', authenticateUser, asyncHandler(async (req, res) => {
  const course = await Course.findByPk(req.params.id);
  if (!course) {
    return res.status(404).json({ error: 'Course Not Found' });
  }
  await Favorite.findOrCreate({
    where: { userId: req.currentUser.id, courseId: course.id }
  });
  res.status(204).end();
}));

// Remove a favorite (idempotent)
router.delete('/courses/:id/favorite', authenticateUser, asyncHandler(async (req, res) => {
  const course = await Course.findByPk(req.params.id);
  if (!course) {
    return res.status(404).json({ error: 'Course Not Found' });
  }
  await Favorite.destroy({
    where: { userId: req.currentUser.id, courseId: course.id }
  });
  res.status(204).end();
}));

// Create a course
router.post('/courses', authenticateUser, asyncHandler(async (req, res) => {
  try {
    const newCourse = await Course.create(req.body);
    res.status(201)
      .location(`/courses/${newCourse.dataValues.id}`)
      .end();
  } catch (error) {
    console.log('ERROR: ', error.name);
    if (error.name === 'SequelizeValidationError' || error.name === 'SequelizeUniqueConstraintError') {
      const errors = error.errors.map(err => err.message);
      res.status(400).json({ errors });
    } else {
      throw error;
    }
  }
}));

// Update an existing course
router.put("/courses/:id", authenticateUser, asyncHandler(async (req, res, next) => {
  const user = req.currentUser;
  let course;
  try {
    course = await Course.findByPk(req.params.id);
    if (course) {
      if (course.userId === user.id) {
        await course.update(req.body);
        res.status(204).end();
      } else {
        res.status(403).json({ error: 'You are not authorised to update this course.' });
      }
    } else {
      const err = new Error(`Course Not Found`);
      res.status(404).json({ error: err.message });
    }
  } catch (error) {
    if (error.name === 'SequelizeValidationError' || error.name === 'SequelizeUniqueConstraintError') {
      const errors = error.errors.map(err => err.message);
      res.status(400).json({ errors });
    } else {
      throw error;
    }
  }
}));

// Delete an existing course
router.delete("/courses/:id", authenticateUser, asyncHandler(async (req, res, next) => {
  const user = req.currentUser;
  const course = await Course.findByPk(req.params.id);
  if (course) {
    if (course.userId === user.id) {
      await course.destroy();
      res.status(204).end();
    } else {
      res.status(403).json({ error: 'You are not authorised to delete this course.' });
    }
  } else {
    const err = new Error(`Course Not Found`);
    res.status(404).json({ error: err.message });
  }
}));

module.exports = router;
