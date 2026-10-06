'use strict';

const bcryptjs = require('bcryptjs');
const Context = require('./context');

class Database {
  constructor(seedData, enableLogging) {
    this.courses = seedData.courses;
    this.users = seedData.users;
    this.favorites = seedData.favorites || [];
    this.enableLogging = enableLogging;
    this.context = new Context('fsjstd-restapi.db', enableLogging);
  }

  log(message) {
    if (this.enableLogging) {
      console.info(message);
    }
  }

  tableExists(tableName) {
    this.log(`Checking if the ${tableName} table exists...`);

    return this.context
      .retrieveValue(`
        SELECT EXISTS (
          SELECT 1 
          FROM sqlite_master 
          WHERE type = 'table' AND name = ?
        );
      `, tableName);
  }

  createUser(user) {
    return this.context
      .execute(`
        INSERT INTO Users
          (firstName, lastName, emailAddress, password, createdAt, updatedAt)
        VALUES
          (?, ?, ?, ?, datetime('now'), datetime('now'));
      `,
      user.firstName,
      user.lastName,
      user.emailAddress,
      user.password);
  }

  createCourse(course) {
    return this.context
      .execute(`
        INSERT INTO Courses
          (userId, title, description, estimatedTime, materialsNeeded, createdAt, updatedAt)
        VALUES
          (?, ?, ?, ?, ?, datetime('now'), datetime('now'));
      `,
      course.userId,
      course.title,
      course.description,
      course.estimatedTime,
      course.materialsNeeded);
  }

  createFavorite(favorite) {
    return this.context
      .execute(`
        INSERT INTO Favorites
          (userId, courseId, createdAt, updatedAt)
        VALUES
          (?, ?, datetime('now'), datetime('now'));
      `,
      favorite.userId,
      favorite.courseId);
  }

  async hashUserPasswords(users) {
    const usersWithHashedPasswords = [];

    for (const user of users) {
      const hashedPassword = await bcryptjs.hash(user.password, 10);
      usersWithHashedPasswords.push({ ...user, password: hashedPassword });
    }

    return usersWithHashedPasswords;
  }

  async createUsers(users) {
    for (const user of users) {
      await this.createUser(user);
    }
  }

  async createCourses(courses) {
    for (const course of courses) {
      await this.createCourse(course);
    }
  }

  async createFavorites(favorites) {
    for (const favorite of favorites) {
      await this.createFavorite(favorite);
    }
  }

  async init() {
    // Favorites reference Users and Courses, so it is dropped first and rebuilt last
    this.log('Dropping the Favorites table...');

    await this.context.execute(`
      DROP TABLE IF EXISTS Favorites;
    `);

    const userTableExists = await this.tableExists('Users');

    if (userTableExists) {
      this.log('Dropping the Users table...');

      await this.context.execute(`
        DROP TABLE IF EXISTS Users;
      `);
    }

    this.log('Creating the Users table...');

    await this.context.execute(`
      CREATE TABLE Users (
        id INTEGER PRIMARY KEY AUTOINCREMENT, 
        firstName VARCHAR(255) NOT NULL DEFAULT '', 
        lastName VARCHAR(255) NOT NULL DEFAULT '', 
        emailAddress VARCHAR(255) NOT NULL DEFAULT '' UNIQUE, 
        password VARCHAR(255) NOT NULL DEFAULT '', 
        createdAt DATETIME NOT NULL, 
        updatedAt DATETIME NOT NULL
      );
    `);

    this.log('Hashing the user passwords...');

    const users = await this.hashUserPasswords(this.users);

    this.log('Creating the user records...');

    await this.createUsers(users);

    const courseTableExists = await this.tableExists('Courses');

    if (courseTableExists) {
      this.log('Dropping the Courses table...');

      await this.context.execute(`
        DROP TABLE IF EXISTS Courses;
      `);
    }

    this.log('Creating the Courses table...');

    await this.context.execute(`
      CREATE TABLE Courses (
        id INTEGER PRIMARY KEY AUTOINCREMENT, 
        title VARCHAR(255) NOT NULL DEFAULT '', 
        description TEXT NOT NULL DEFAULT '', 
        estimatedTime VARCHAR(255), 
        materialsNeeded VARCHAR(255), 
        createdAt DATETIME NOT NULL, 
        updatedAt DATETIME NOT NULL, 
        userId INTEGER NOT NULL DEFAULT -1 
          REFERENCES Users (id) ON DELETE CASCADE ON UPDATE CASCADE
      );
    `);

    await this.context.execute(`
      CREATE INDEX courses_title ON Courses (title);
    `);

    await this.context.execute(`
      CREATE INDEX courses_user_id ON Courses (userId);
    `);

    this.log('Creating the course records...');

    await this.createCourses(this.courses);

    this.log('Creating the Favorites table...');

    await this.context.execute(`
      CREATE TABLE Favorites (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER NOT NULL
          REFERENCES Users (id) ON DELETE CASCADE ON UPDATE CASCADE,
        courseId INTEGER NOT NULL
          REFERENCES Courses (id) ON DELETE CASCADE ON UPDATE CASCADE,
        createdAt DATETIME NOT NULL,
        updatedAt DATETIME NOT NULL
      );
    `);

    await this.context.execute(`
      CREATE UNIQUE INDEX favorites_user_course_unique ON Favorites (userId, courseId);
    `);

    this.log('Creating the favorite records...');

    await this.createFavorites(this.favorites);

    this.log('Database successfully initialized!');
  }
}

module.exports = Database;
