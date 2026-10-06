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
To initialise the database with sample data.

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
Returns the authenticated user's favorited courses (`id`, `title`, `userId` and the owner's name), most recently favorited first.

### Courses
#### `GET /api/courses`
Returns courses with optional search, filtering, sorting and pagination. The total number of matching courses is returned in the `X-Total-Count` response header.

| Query param | Description |
| --- | --- |
| `q` | Case-insensitive match on title or description (trimmed; blank is ignored). Case-folding is ASCII-only in SQLite. |
| `userId` | Positive integer; only courses owned by that user |
| `sort` | `title_asc`, `title_desc` or `created_desc`. Default order is `id` ascending |
| `page` | Integer >= 1 (default `1`) |
| `pageSize` | Integer 1-50 (default `10`) |

Invalid params return `400` with `{ "errors": ["Invalid page", ...] }`.

#### `GET /api/courses/:id`
Returns details of a specific course by course id

#### `POST /api/courses`
Creates a new course. Required fields are:
- title
- description

Only authorised users are permitted to create courses. The course owner is always the authenticated user; any `userId` in the request body is ignored.

#### `PUT /api/courses/:id`
Updates details of a course. Only the currently authenticated User who is the owner of the course is permitted to update the course (`403` otherwise). A `userId` in the request body is ignored; ownership cannot be changed.

#### `DELETE /api/courses/:id`
Deletes a course by course id. Only the currently authenticated User who is the owner of the course is permitted to delete the course. 