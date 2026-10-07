const auth = require('basic-auth');
const bcrypt = require('bcrypt');
const { User } = require('../models');
const { ApiError } = require('./errors');

/**
 * Resolve the user for the request's Basic Auth header.
 * Returns { user } on success, { message } on failure, or {} if there is no header.
 */
const resolveUser = async (req) => {
  const credentials = auth(req);
  if (!credentials) {
    return {};
  }

  const user = await User.findOne({ where: { emailAddress: credentials.name } });
  if (!user) {
    return { message: `User ${credentials.name} not found.` };
  }
  if (!bcrypt.compareSync(credentials.pass, user.password)) {
    return { message: `Authentication failed for user ${credentials.name}` };
  }
  return { user };
};

/** Based on Treehouse Workshop REST API Authentication with Express */
exports.authenticateUser = async (req, res, next) => {
  try {
    const { user, message } = await resolveUser(req);
    if (user) {
      console.log(`Authentication successful for user ${user.emailAddress}`);
      req.currentUser = user;
      return next();
    }
    console.warn(message || 'Auth header not found');
    next(new ApiError(401, 'Access Denied'));
  } catch (error) {
    next(error);
  }
};

/**
 * Like authenticateUser, but anonymous requests are allowed through.
 * Credentials that are supplied but invalid are still rejected.
 */
exports.optionalAuthenticateUser = async (req, res, next) => {
  try {
    const { user, message } = await resolveUser(req);
    if (message) {
      console.warn(message);
      return next(new ApiError(401, 'Access Denied'));
    }
    if (user) {
      req.currentUser = user;
    }
    next();
  } catch (error) {
    next(error);
  }
};
