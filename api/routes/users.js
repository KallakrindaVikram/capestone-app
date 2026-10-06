const express = require('express');

const router = express.Router();
const { User, Course, Favorite } = require('../models');
const { authenticateUser } = require('../middleware/auth-user');
const { asyncHandler } = require('../middleware/async-handler');

// Return the list of users
router.get('/users', authenticateUser, asyncHandler(async (req, res) => {
  const user = req.currentUser;

  const userResult = await User.findOne({
    where: {
      emailAddress: user.emailAddress
    },
    attributes: {
      exclude: ['password', 'createdAt', 'updatedAt']
    }
  });

  res.json(userResult);
}));

// Return the authenticated user's favorited courses, most recently favorited first
router.get('/users/me/favorites', authenticateUser, asyncHandler(async (req, res) => {
  const favorites = await Favorite.findAll({
    where: { userId: req.currentUser.id },
    include: {
      model: Course,
      attributes: ['id', 'title', 'userId'],
      required: true,
      include: {
        model: User,
        attributes: ['id', 'firstName', 'lastName']
      }
    },
    order: [['createdAt', 'DESC'], ['id', 'DESC']]
  });

  res.json(favorites.map((favorite) => favorite.Course));
}));

// Create a user
router.post('/users', asyncHandler(async (req, res) => {
  try {
    await User.create(req.body);
    res.status(201)
      .location('/')
      .end();
  } catch (error) {
    if (error.name === 'SequelizeValidationError' || error.name === 'SequelizeUniqueConstraintError') {
      const errors = error.errors.map(err => err.message);
      res.status(400).json({ errors: errors });
    } else {
      res.status(400).json({ error: error.message });
    }
  }
}));

module.exports = router;

