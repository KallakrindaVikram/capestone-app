const auth = require('basic-auth');
const bcrypt = require('bcrypt');
const { User } = require('../models');

/** Based on Treehouse Workshop REST API Authentication with Express */
exports.authenticateUser = async (req, res, next) => {
  let message;

  const credentials = auth(req);

  if (credentials) {
    const user = await User.findOne({
      where: {
        emailAddress: credentials.name
      }
    });

    if (user) {
      const authenticated = bcrypt.compareSync(credentials.pass, user.password);
      if (authenticated) {
        console.log(`Authentication successful for user ${credentials.name}`);
        req.currentUser = user;
      } else {
        message = `Authentication failed for user ${credentials.name}`;
      }
    } else {
      message = `User ${credentials.name} not found.`
    }
  } else {
    message = 'Auth header not found';
  }

  if (message) {
    console.warn(message);
    res.status(401).json({ message: 'Access Denied' });
  } else {
    next();
  }
}

/** Sets req.currentUser when valid Basic Auth credentials are supplied; never rejects the request. */
exports.optionalAuthenticateUser = async (req, res, next) => {
  const credentials = auth(req);
  if (credentials) {
    const user = await User.findOne({ where: { emailAddress: credentials.name } });
    if (user && bcrypt.compareSync(credentials.pass, user.password)) {
      req.currentUser = user;
    }
  }
  next();
};
