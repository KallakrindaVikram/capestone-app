const express = require('express');
const { Op } = require('sequelize');

const router = express.Router();
const { Course, User, Favorite, sequelize } = require('../models');
const { authenticateUser } = require('../middleware/auth-user');
const { asyncHandler } = require('../middleware/async-handler');

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 50;

// Maps the public `sort` values to Sequelize order clauses (id is a stable tie-breaker)
const SORT_ORDERS = {
  title_asc: [['title', 'ASC'], ['id', 'ASC']],
  title_desc: [['title', 'DESC'], ['id', 'ASC']],
  created_desc: [['createdAt', 'DESC'], ['id', 'DESC']]
};
// Documented default: id ascending (stable)
const DEFAULT_ORDER = [['id', 'ASC']];

// Course fields a client is allowed to write; userId is deliberately excluded
const WRITABLE_COURSE_FIELDS = ['title', 'description', 'estimatedTime', 'materialsNeeded'];

const pickCourseFields = (body = {}) => {
  const fields = {};
  WRITABLE_COURSE_FIELDS.forEach((field) => {
    if (body[field] !== undefined) {
      fields[field] = body[field];
    }
  });
  return fields;
};

// Returns a positive integer parsed from a strict digits-only string, otherwise null
const parsePositiveInt = (value) => {
  if (typeof value !== 'string' || !/^\d+$/.test(value.trim())) {
    return null;
  }
  const number = parseInt(value, 10);
  return number >= 1 && Number.isSafeInteger(number) ? number : null;
};

// Escape LIKE wildcards so user input is matched literally
const escapeLike = (text) => text.replace(/[\\%_]/g, (char) => `\\${char}`);

// Case-insensitive "contains" match. SQLite lower()/LIKE only fold ASCII characters.
const containsClause = (column, pattern) =>
  sequelize.literal(`lower(${column}) LIKE lower(${sequelize.escape(pattern)}) ESCAPE '\\'`);

// Return courses, optionally searched, filtered, sorted and paginated
router.get('/courses', asyncHandler(async (req, res) => {
  const { sort, userId: userIdParam } = req.query;
  const qParam = Array.isArray(req.query.q) ? req.query.q[0] : req.query.q;
  const errors = [];

  let page = 1;
  if (req.query.page !== undefined) {
    page = parsePositiveInt(req.query.page);
    if (page === null) errors.push('Invalid page');
  }

  let pageSize = DEFAULT_PAGE_SIZE;
  if (req.query.pageSize !== undefined) {
    pageSize = parsePositiveInt(req.query.pageSize);
    if (pageSize === null || pageSize > MAX_PAGE_SIZE) errors.push('Invalid pageSize');
  }

  let userId;
  if (userIdParam !== undefined) {
    userId = parsePositiveInt(userIdParam);
    if (userId === null) errors.push('Invalid userId');
  }

  if (sort !== undefined && !Object.prototype.hasOwnProperty.call(SORT_ORDERS, sort)) {
    errors.push('Invalid sort');
  }

  if (errors.length) {
    return res.status(400).json({ errors });
  }

  const conditions = [];
  if (userId) {
    conditions.push({ userId });
  }
  const q = typeof qParam === 'string' ? qParam.trim() : '';
  if (q) {
    const pattern = `%${escapeLike(q)}%`;
    conditions.push({
      [Op.or]: [
        containsClause('`Course`.`title`', pattern),
        containsClause('`Course`.`description`', pattern)
      ]
    });
  }
  const where = conditions.length ? { [Op.and]: conditions } : {};

  const total = await Course.count({ where });
  const courses = await Course.findAll({
    where,
    attributes: ['id', 'title', 'description', 'estimatedTime', 'materialsNeeded', 'userId', 'createdAt', 'updatedAt'],
    include: {
      model: User,
      attributes: ['id', 'firstName', 'lastName', 'emailAddress']
    },
    order: SORT_ORDERS[sort] || DEFAULT_ORDER,
    limit: pageSize,
    offset: (page - 1) * pageSize
  });

  res.set('X-Total-Count', String(total));
  res.json(courses);
}));

// Return a specific course
router.get('/courses/:id', asyncHandler(async (req, res) => {
  const course = await Course.findByPk(req.params.id, {
    attributes: {
      exclude: ['createdAt', 'updatedAt']
    },
    include: {
      model: User,
      attributes: {
        exclude: ['password', 'createdAt', 'updatedAt']
      }
    }
  });
  if (course) {
    res.json(course);
  } else {
    res.json({
      "error": "Sorry, we couldn't find the course you were looking for."
    });
  }
}));

// Create a course; ownership always comes from the authenticated user, never from the request body
router.post('/courses', authenticateUser, asyncHandler(async (req, res) => {
  try {
    const newCourse = await Course.create({
      ...pickCourseFields(req.body),
      userId: req.currentUser.id
    });
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

// Update an existing course (owner only; userId in the body is ignored)
router.put("/courses/:id", authenticateUser, asyncHandler(async (req, res, next) => {
  const user = req.currentUser;
  try {
    const course = await Course.findByPk(req.params.id);
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }
    if (course.userId !== user.id) {
      return res.status(403).json({ error: 'Forbidden: You do not own this course.' });
    }
    await course.update(pickCourseFields(req.body), { fields: WRITABLE_COURSE_FIELDS });
    res.status(204).end();
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
      res.status(403).json({ error: 'Forbidden: You do not own this course.' });
    }
  } else {
    res.status(404).json({ error: 'Course not found' });
  }
}));

// Resolves the :id param to an existing course, or sends the 400/404 response and returns null
const findCourseForFavorite = async (req, res) => {
  const courseId = parsePositiveInt(req.params.id);
  if (courseId === null) {
    res.status(400).json({ errors: ['Invalid course id'] });
    return null;
  }
  const course = await Course.findByPk(courseId, { attributes: ['id'] });
  if (!course) {
    res.status(404).json({ error: 'Course not found' });
    return null;
  }
  return course;
};

// Favorite a course for the authenticated user (idempotent)
router.post('/courses/:id/favorite', authenticateUser, asyncHandler(async (req, res) => {
  const course = await findCourseForFavorite(req, res);
  if (!course) return;

  // Single INSERT OR IGNORE statement: atomic against the (userId, courseId) unique index, and avoids the
  // per-call transaction/connection that findOrCreate opens on SQLite (which fails under concurrent requests)
  await Favorite.bulkCreate(
    [{ userId: req.currentUser.id, courseId: course.id }],
    { ignoreDuplicates: true }
  );
  res.status(204).end();
}));

// Unfavorite a course for the authenticated user (idempotent)
router.delete('/courses/:id/favorite', authenticateUser, asyncHandler(async (req, res) => {
  const course = await findCourseForFavorite(req, res);
  if (!course) return;

  await Favorite.destroy({ where: { userId: req.currentUser.id, courseId: course.id } });
  res.status(204).end();
}));

module.exports = router;
