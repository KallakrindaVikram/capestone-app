'use strict';

const enableGlobalErrorLogging = () => process.env.ENABLE_GLOBAL_ERROR_LOGGING === 'true';

/**
 * Error with an HTTP status. Responses use one of two shapes:
 *   { error: "message" }       - single failure (401, 403, 404, ...)
 *   { errors: ["m1", "m2"] }   - validation failures (400)
 */
class ApiError extends Error {
  constructor(status, message, errors) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
}

const notFound = (message = 'Course Not Found') => new ApiError(404, message);

const notFoundHandler = (req, res, next) => next(new ApiError(404, 'Route Not Found'));

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  if (enableGlobalErrorLogging()) {
    console.error(`Global error handler: ${JSON.stringify(err.stack)}`);
  }

  if (err.name === 'SequelizeValidationError' || err.name === 'SequelizeUniqueConstraintError') {
    return res.status(400).json({ errors: err.errors.map((e) => e.message) });
  }

  if (err instanceof ApiError && err.errors) {
    return res.status(err.status).json({ errors: err.errors });
  }

  // body-parser failures (malformed JSON) carry a 4xx status
  const status = err.status || err.statusCode || 500;
  if (status >= 500) {
    if (!enableGlobalErrorLogging()) console.error(err);
    return res.status(status).json({ error: 'Internal Server Error' });
  }
  return res.status(status).json({ error: err.type === 'entity.parse.failed' ? 'Invalid JSON body' : err.message });
};

module.exports = { ApiError, notFound, notFoundHandler, errorHandler };
