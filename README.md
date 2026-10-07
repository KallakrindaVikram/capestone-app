# Full Stack App with React and a REST API

This project is a Full Stack React application utilising the [School Database REST API built in a previous project.](https://github.com/alexhippo/rest-api-sql-v3) Users can use the web interface built with React to:
- sign up
- sign in
- view courses
- create a course (if signed in)
- update their own courses (if authorised)
- delete their own courses (if authorised)
- search, sort and page through the course catalog
- archive and unarchive their own courses (archived courses are hidden from everyone else)

This app was implemented according to the designs specified in the `/mockups` and `/markup` folder.

## Motivation
This project was created as part of the [Treehouse Full Stack Javascript Techdegree](https://teamtreehouse.com/techdegree/full-stack-javascript).

## Technologies used
- Javascript
- Node.js
- Express
- SQLite
- SQL ORM Sequelize
- Postman
- React - React Router, Hooks, Context API
- Authentication

## Getting started

### Downloading
Click on the 'Code' button and clone this project via command line or select 'Download Zip.'

### Installing and running
1. Unzip the zip file if you have downloaded this project as a zip file.
1. Open the folder on the command line, such as Git Bash, Powershell or Terminal.
1. Run `npm install` in both the `api` and `client` folders to install all dependencies to run this project.
1. On the `api` folder, run `npm run seed` to initialise the database with sample data (an existing database is upgraded automatically on startup, or manually with `npm run migrate`)
1. Run `npm start` to start the application.
1. Open your browser/API testing platform and visit [http://localhost:3000](http://localhost:3000).

## Available Scripts
In the project directory, you can run:

### `npm install`
To install and update project dependencies.

### `npm run seed`
To initialise the database with sample data.

### `npm start`
Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view the site in the browser.

### `npm test`
Run in `api` (Node's built-in test runner against an in-memory SQLite database) or in `client` (Jest and React Testing Library).

### `npm run migrate`
Run in `api` to apply database migrations (adds the `archived` column and search/sort indexes to `Courses`).

## API changes

### `GET /api/courses`
Query parameters (all optional):

| Parameter | Description |
| --- | --- |
| `page` | 1-based page number (default `1`) |
| `limit` | Courses per page, 1-100 (default `10`) |
| `q` | Keyword matched against course title and description (case-insensitive, max 100 characters) |
| `sort` | `id` (default), `title` or `createdAt`; prefix with `-` for descending, e.g. `-title` |
| `includeArchived` | `true` also returns the signed-in user's own archived courses (requires Basic Auth) |

The response is `{ "courses": [...], "pagination": { "page", "limit", "total", "totalPages" } }`. Archived courses are hidden unless requested by their owner.

### Archiving
- `POST /api/courses/:id/archive` and `POST /api/courses/:id/unarchive` (owner only, `204` on success).
- `GET /api/courses/:id` returns an archived course to its owner only; everyone else receives `404`.

### Errors
- Validation failures (`400`): `{ "errors": ["message", ...] }`
- All other failures: `{ "error": "message" }`, e.g. `404` `{ "error": "Course Not Found" }`, `401` `{ "error": "Access Denied" }`, `403` `{ "error": "You are not authorised to ..." }`.
