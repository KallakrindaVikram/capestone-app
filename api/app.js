'use strict';

// load modules
const express = require('express');
const morgan = require('morgan');
const { sequelize, Sequelize } = require('./models');
const cors = require('cors');
const { notFoundHandler, errorHandler } = require('./middleware/errors');
const addArchivedAndIndexes = require('./migrations/20261007000000-add-archived-and-indexes-to-courses');

const userRouter = require('./routes/users');
const courseRouter = require('./routes/courses');

// create the Express app
const app = express();

// setup morgan which gives us http request logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// set up cors 
app.use(cors());

// set up Express to work with JSON
app.use(express.json());

// setup a friendly greeting for the root route
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to the REST API project!',
  });
});

// Add routes
app.use('/api', userRouter);
app.use('/api', courseRouter);

// send 404 if no other route matched
app.use(notFoundHandler);

// setup a global error handler
app.use(errorHandler);

// set our port
app.set('port', process.env.PORT || 5000);

// Bring the schema up to date (sync() does not alter existing tables)
const prepareDatabase = async () => {
  await sequelize.authenticate();
  console.log('Connection has been established successfully.');
  await sequelize.sync();
  await addArchivedAndIndexes.up(sequelize.getQueryInterface(), Sequelize);
};

// start listening on our port
if (require.main === module) {
  prepareDatabase()
    .then(() => {
      const server = app.listen(app.get('port'), () => {
        console.log(`Express server is listening on port ${server.address().port}`);
      });
    })
    .catch((error) => {
      console.error('Unable to start the application: ', error);
      process.exit(1);
    });
}

module.exports = app;
