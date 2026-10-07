const express = require('express');
const { Op, literal, fn, col } = require('sequelize');

const router = express.Router();
const { Course, User, sequelize } = require('../models');
const { authenticateUser, optionalAuthenticateUser } = require('../middleware/auth-user');
const { asyncHandler } = require('../middleware/async-handler');
const { ApiError, notFound } = require('../middleware/errors');
const { parseCourseQuery } = require('../middleware/validate-course-query');

const COURSE_FIELDS = ['title', 'description', 'estimatedTime', 'materialsNeeded'];

const courseInclude = {
  model: User,
  attributes: {
    exclude: ['password', 'createdAt', 'updatedAt']
  }
};

// Only client-editable fields are accepted, so `archived` and `userId` cannot be mass-assigned
const pickCourseFields = (body = {}) =>
  COURSE_FIELDS.reduce((fields, name) => {
    if (body[name] !== undefined) fields[name] = body[name];
    return fields;
  }, {});

const findCourseOr404 = async (id, options) => {
  if (!/^\d+$/.test(id)) throw notFound();
  const course = await Course.findByPk(id, options);
  if (!course) throw notFound();
  return course;
};

const requireOwner = (course, user, action) => {
  if (course.userId !== user.id) {
    throw new ApiError(403, `You are not authorised to ${action} this course.`);
  }
};

// Return courses, paginated: ?page=1&limit=10&q=keyword&sort=-title&includeArchived=true
router.get('/courses', optionalAuthenticateUser, asyncHandler(async (req, res) => {
  const { page, limit, q, sortField, sortDirection, includeArchived } = parseCourseQuery(req.query);
  const user = req.currentUser;

  if (includeArchived && !user) {
    throw new ApiError(401, 'Access Denied');
  }

  const conditions = [];

  // Archived courses are only ever visible to their owner
  conditions.push(includeArchived
    ? { [Op.or]: [{ archived: false }, { archived: true, userId: user.id }] }
    : { archived: false });

  if (q) {
    // Escape LIKE wildcards so the keyword is matched literally
    const pattern = sequelize.escape(`%${q.replace(/[\\%_]/g, '\\$&')}%`);
    conditions.push({
      [Op.or]: [
        literal(`"Course"."title" LIKE ${pattern} ESCAPE '\\'`),
        literal(`"Course"."description" LIKE ${pattern} ESCAPE '\\'`),
      ]
    });
  }

  const orderColumn = sortField === 'title' ? fn('lower', col('Course.title')) : col(`Course.${sortField}`);

  const { rows, count } = await Course.findAndCountAll({
    where: { [Op.and]: conditions },
    attributes: { exclude: ['createdAt', 'updatedAt'] },
    include: courseInclude,
    order: [[orderColumn, sortDirection], [col('Course.id'), 'ASC']],
    limit,
    offset: (page - 1) * limit,
  });

  res.json({
    courses: rows,
    pagination: { page, limit, total: count, totalPages: Math.ceil(count / limit) },
  });
}));

// Return a specific course. Archived courses are visible to their owner only.
router.get('/courses/:id', optionalAuthenticateUser, asyncHandler(async (req, res) => {
  const course = await findCourseOr404(req.params.id, {
    attributes: { exclude: ['createdAt', 'updatedAt'] },
    include: courseInclude,
  });
  if (course.archived && (!req.currentUser || req.currentUser.id !== course.userId)) {
    throw notFound();
  }
  res.json(course);
}));

// Create a course
router.post('/courses', authenticateUser, asyncHandler(async (req, res) => {
  const newCourse = await Course.create({ ...pickCourseFields(req.body), userId: req.currentUser.id });
  res.status(201)
    .location(`/courses/${newCourse.id}`)
    .end();
}));

// Update an existing course
router.put('/courses/:id', authenticateUser, asyncHandler(async (req, res) => {
  const course = await findCourseOr404(req.params.id);
  requireOwner(course, req.currentUser, 'update');
  await course.update(pickCourseFields(req.body));
  res.status(204).end();
}));

// Archive (soft delete) a course
router.post('/courses/:id/archive', authenticateUser, asyncHandler(async (req, res) => {
  const course = await findCourseOr404(req.params.id);
  requireOwner(course, req.currentUser, 'archive');
  await course.update({ archived: true });
  res.status(204).end();
}));

// Restore an archived course
router.post('/courses/:id/unarchive', authenticateUser, asyncHandler(async (req, res) => {
  const course = await findCourseOr404(req.params.id);
  requireOwner(course, req.currentUser, 'unarchive');
  await course.update({ archived: false });
  res.status(204).end();
}));

// Delete an existing course
router.delete('/courses/:id', authenticateUser, asyncHandler(async (req, res) => {
  const course = await findCourseOr404(req.params.id);
  requireOwner(course, req.currentUser, 'delete');
  await course.destroy();
  res.status(204).end();
}));

module.exports = router;
