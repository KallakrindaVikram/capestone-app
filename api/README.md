# REST API 

This project is a REST API to administer a school database containing information about users and their courses.

## Motivation
This project was created as part of the [Treehouse Full Stack Javascript Techdegree](https://teamtreehouse.com/techdegree/full-stack-javascript).

## Technologies used
- Javascript
- Node.js
- Express
- SQLite
- SQL ORM Sequelize
- Postman

## Getting started
### Please note
This project runs and has been tested with `sqlite3` version `5.0.2`.

### Downloading
Click on the 'Code' button and clone this project via command line or select 'Download Zip.'

### Installing and running
1. Unzip the zip file if you have downloaded this project as a zip file.
1. Open the folder on the command line, such as Git Bash, Powershell or Terminal.
1. Run `npm install` to install all dependencies to run this project.
1. Run `npm run seed` to initialise the database with sample data
1. Run `npm start` to start the application.
1. Open your browser/API testing platform and visit [http://localhost:3000](http://localhost:3000).

## Available Scripts
In the project directory, you can run:

### `npm install`
To install and update project dependencies.

### `npm run seed`
To initialise the database with sample data: 4 users, 30 courses and 16 favorites. This drops and recreates the tables. Sample sign-ins: `joe@smith.com` / `joepassword`, `sally@jones.com` / `sallypassword`, `alex@rivera.com` / `alexpassword` (7 favorites), `priya@patel.com` / `priyapassword`.

### `npm run migrate`
Applies the Sequelize migrations in `migrations/` (Favorites table and the `Courses.title` / `Courses.userId` indexes). Idempotent; `npm start` also creates missing tables and indexes via `sequelize.sync()`.

### `npm test`
Runs the API tests (Node's built-in test runner, against a temporary SQLite database).

### `npm start`
Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view the API in the browser or an API testing platform such as Postman.

## API endpoints

### Users
#### `GET /api/users`
Returns all properties and values for the currently authenticated User

#### `POST /api/users`
Creates a new user. Required fields are:
- firstName
- lastName
- emailAddress
- password

#### `GET /api/users/me/favorites`
Returns `{ "items": [...] }`: the courses favorited by the authenticated user (most recent first), in the same shape as the catalog list.

#### `GET /api/owners`
Returns `{ "items": [{ "id", "firstName", "lastName" }] }`: the users who own at least one course. Used to populate the catalog owner filter.

### Courses
#### `GET /api/courses`
Returns a page of courses with pagination metadata. All query parameters are optional:

| Param | Rules |
| --- | --- |
| `q` | Trimmed; case-insensitive "contains" match on title or description. Empty means no search. |
| `ownerId` | Positive integer; only courses owned by this user. Anything else returns `400 {"errors":["Invalid ownerId"]}`. |
| `sort` | `newest` (default, `createdAt` descending) or `title_asc`. Invalid values fall back to `newest`. |
| `page` | Defaults to 1. Invalid, non-numeric or `< 1` becomes 1; a page past the end returns the last page. |
| `pageSize` | Defaults to 12. Invalid becomes 12; clamped to 1-50. |

```json
{
  "items": [{ "id": 1, "title": "...", "description": "...", "User": { "id": 2, "firstName": "...", "lastName": "...", "emailAddress": "..." } }],
  "meta": { "totalCount": 37, "page": 1, "pageSize": 12, "totalPages": 4, "sortApplied": "newest", "qApplied": "react", "ownerIdApplied": 2 }
}
```

#### `GET /api/courses/:id`
Returns details of a specific course by course id. Includes `isFavorited` (`true`/`false`; always `false` when not signed in). Returns `404 {"error":"Course Not Found"}` if the course does not exist.

#### `POST /api/courses/:id/favorite`
Adds the course to the authenticated user's favorites. Returns `204`; idempotent if already favorited. `404` if the course does not exist, `401` if not authenticated.

#### `DELETE /api/courses/:id/favorite`
Removes the course from the authenticated user's favorites. Returns `204`; idempotent if it was not favorited. `404` if the course does not exist, `401` if not authenticated.

#### `POST /api/courses`
Creates a new course. Required fields are:
- title
- description

Only authorised users are permitted to create courses.

#### `PUT /api/courses/:id`
Updates details of a course. Only the currently authenticated User who is the owner of the course is permitted to update the course.

#### `DELETE /api/courses/:id`
Deletes a course by course id. Only the currently authenticated User who is the owner of the course is permitted to delete the course. 