const express = require('express');

const router = express.Router();
const User = require('../models').User;
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

// Create a user
router.post('/users', asyncHandler(async (req, res) => {
  await User.create(req.body);
  res.status(201)
    .location('/')
    .end();
}));

module.exports = router;

