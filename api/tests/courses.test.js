'use strict';

process.env.NODE_ENV = 'test';

const { test, before, after, beforeEach, describe } = require('node:test');
const assert = require('node:assert/strict');

const app = require('../app');
const { sequelize, Sequelize, User, Course } = require('../models');
const addArchivedAndIndexes = require('../migrations/20261007000000-add-archived-and-indexes-to-courses');

let server;
let baseUrl;
let owner;
let other;

const basic = (email, password) => ({
  Authorization: `Basic ${Buffer.from(`${email}:${password}`).toString('base64')}`,
});
const OWNER_AUTH = basic('owner@example.com', 'ownerpassword');
const OTHER_AUTH = basic('other@example.com', 'otherpassword');

const request = async (path, { method = 'GET', headers = {}, body } = {}) => {
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null, headers: res.headers };
};

const makeCourse = (attrs) =>
  Course.create({ description: 'A description', userId: owner.id, ...attrs });

before(async () => {
  await sequelize.sync({ force: true });
  await addArchivedAndIndexes.up(sequelize.getQueryInterface(), Sequelize);
  server = app.listen(0);
  baseUrl = `http://127.0.0.1:${server.address().port}/api`;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
  await sequelize.close();
});

beforeEach(async () => {
  await Course.destroy({ where: {} });
  await User.destroy({ where: {} });
  owner = await User.create({ firstName: 'Olive', lastName: 'Owner', emailAddress: 'owner@example.com', password: 'ownerpassword' });
  other = await User.create({ firstName: 'Otto', lastName: 'Other', emailAddress: 'other@example.com', password: 'otherpassword' });
});

describe('GET /courses pagination', () => {
  test('defaults to page 1 with 10 items and returns pagination metadata', async () => {
    for (let i = 1; i <= 25; i++) await makeCourse({ title: `Course ${i}` });
    const { status, body } = await request('/courses');
    assert.equal(status, 200);
    assert.equal(body.courses.length, 10);
    assert.deepEqual(body.pagination, { page: 1, limit: 10, total: 25, totalPages: 3 });
    assert.equal(body.courses[0].User.emailAddress, 'owner@example.com');
    assert.equal(body.courses[0].User.password, undefined);
  });

  test('returns the requested page and a partial last page', async () => {
    for (let i = 1; i <= 25; i++) await makeCourse({ title: `Course ${i}` });
    const { body } = await request('/courses?page=3&limit=10');
    assert.equal(body.courses.length, 5);
    assert.equal(body.pagination.page, 3);
  });

  test('returns an empty list for a page past the end', async () => {
    await makeCourse({ title: 'Only one' });
    const { status, body } = await request('/courses?page=9');
    assert.equal(status, 200);
    assert.deepEqual(body.courses, []);
    assert.equal(body.pagination.total, 1);
  });

  test('does not repeat or skip courses across pages', async () => {
    for (let i = 1; i <= 7; i++) await makeCourse({ title: 'Same title' });
    const ids = [];
    for (const page of [1, 2, 3]) {
      const { body } = await request(`/courses?page=${page}&limit=3&sort=title`);
      ids.push(...body.courses.map((c) => c.id));
    }
    assert.equal(new Set(ids).size, 7);
  });
});

describe('GET /courses search and sort', () => {
  beforeEach(async () => {
    await makeCourse({ title: 'Banana Bread', description: 'Baking basics' });
    await makeCourse({ title: 'apple pie', description: 'Dessert with fruit' });
    await makeCourse({ title: 'Cherry Tart', description: 'Uses an APPLE filling' });
    await makeCourse({ title: 'Discount 100%', description: 'Percent sign test' });
  });

  test('matches keyword case-insensitively in title or description', async () => {
    const { body } = await request('/courses?q=apple&sort=title');
    assert.deepEqual(body.courses.map((c) => c.title), ['apple pie', 'Cherry Tart']);
    assert.equal(body.pagination.total, 2);
  });

  test('treats % and _ as literal characters', async () => {
    assert.equal((await request('/courses?q=100%25')).body.courses.length, 1);
    assert.equal((await request('/courses?q=%25')).body.courses.length, 1);
    assert.equal((await request('/courses?q=_')).body.courses.length, 0);
  });

  test('handles quotes in the keyword safely', async () => {
    const { status, body } = await request(`/courses?q=${encodeURIComponent("' OR 1=1 --")}`);
    assert.equal(status, 200);
    assert.equal(body.courses.length, 0);
  });

  test('sorts by title ascending ignoring case, and descending with a - prefix', async () => {
    const asc = await request('/courses?sort=title');
    assert.deepEqual(asc.body.courses.map((c) => c.title), ['apple pie', 'Banana Bread', 'Cherry Tart', 'Discount 100%']);
    const desc = await request('/courses?sort=-title');
    assert.deepEqual(desc.body.courses.map((c) => c.title), ['Discount 100%', 'Cherry Tart', 'Banana Bread', 'apple pie']);
  });

  test('sorts by id descending', async () => {
    const { body } = await request('/courses?sort=-id');
    const ids = body.courses.map((c) => c.id);
    assert.deepEqual(ids, [...ids].sort((a, b) => b - a));
  });
});

describe('GET /courses validation', () => {
  const cases = [
    ['page=0', /"page"/],
    ['page=abc', /"page"/],
    ['page=-1', /"page"/],
    ['limit=0', /"limit"/],
    ['limit=101', /"limit"/],
    ['limit=1.5', /"limit"/],
    ['sort=password', /"sort"/],
    ['sort=-nope', /"sort"/],
    ['includeArchived=yes', /"includeArchived"/],
    ['page=1&page=2', /"page"/],
    [`q=${'x'.repeat(101)}`, /"q"/],
  ];
  for (const [query, pattern] of cases) {
    test(`rejects ${query.slice(0, 20)} with { errors: [...] }`, async () => {
      const { status, body } = await request(`/courses?${query}`);
      assert.equal(status, 400);
      assert.ok(Array.isArray(body.errors));
      assert.match(body.errors[0], pattern);
    });
  }

  test('reports every invalid parameter at once', async () => {
    const { body } = await request('/courses?page=0&limit=0&sort=x');
    assert.equal(body.errors.length, 3);
  });
});

describe('archiving', () => {
  test('new courses are not archived', async () => {
    const course = await makeCourse({ title: 'Fresh' });
    const { body } = await request(`/courses/${course.id}`);
    assert.equal(body.archived, false);
  });

  test('owner can archive and unarchive a course', async () => {
    const course = await makeCourse({ title: 'Toggle' });
    assert.equal((await request(`/courses/${course.id}/archive`, { method: 'POST', headers: OWNER_AUTH })).status, 204);
    assert.equal((await request(`/courses/${course.id}`, { headers: OWNER_AUTH })).body.archived, true);
    assert.equal((await request(`/courses/${course.id}/unarchive`, { method: 'POST', headers: OWNER_AUTH })).status, 204);
    assert.equal((await request(`/courses/${course.id}`)).body.archived, false);
  });

  test('archive and unarchive are idempotent', async () => {
    const course = await makeCourse({ title: 'Twice' });
    for (let i = 0; i < 2; i++) {
      assert.equal((await request(`/courses/${course.id}/archive`, { method: 'POST', headers: OWNER_AUTH })).status, 204);
    }
    for (let i = 0; i < 2; i++) {
      assert.equal((await request(`/courses/${course.id}/unarchive`, { method: 'POST', headers: OWNER_AUTH })).status, 204);
    }
  });

  test('requires authentication', async () => {
    const course = await makeCourse({ title: 'Locked' });
    const res = await request(`/courses/${course.id}/archive`, { method: 'POST' });
    assert.equal(res.status, 401);
    assert.deepEqual(res.body, { error: 'Access Denied' });
    assert.equal((await request(`/courses/${course.id}/archive`, { method: 'POST', headers: basic('owner@example.com', 'wrongpassword') })).status, 401);
  });

  test('only the owner can archive or unarchive (403)', async () => {
    const course = await makeCourse({ title: 'Mine' });
    for (const action of ['archive', 'unarchive']) {
      const res = await request(`/courses/${course.id}/${action}`, { method: 'POST', headers: OTHER_AUTH });
      assert.equal(res.status, 403);
      assert.match(res.body.error, /not authorised/);
    }
    assert.equal((await Course.findByPk(course.id)).archived, false);
  });

  test('returns 404 when archiving a course that does not exist', async () => {
    const res = await request('/courses/9999/archive', { method: 'POST', headers: OWNER_AUTH });
    assert.equal(res.status, 404);
    assert.deepEqual(res.body, { error: 'Course Not Found' });
  });

  test('archived courses are hidden from the default list', async () => {
    await makeCourse({ title: 'Visible' });
    await makeCourse({ title: 'Hidden', archived: true });
    const { body } = await request('/courses', { headers: OWNER_AUTH });
    assert.deepEqual(body.courses.map((c) => c.title), ['Visible']);
    assert.equal(body.pagination.total, 1);
  });

  test('includeArchived shows the owner their own archived courses only', async () => {
    await makeCourse({ title: 'Visible' });
    await makeCourse({ title: 'Mine archived', archived: true });
    await makeCourse({ title: 'Theirs archived', archived: true, userId: other.id });

    const mine = await request('/courses?includeArchived=true&sort=title', { headers: OWNER_AUTH });
    assert.deepEqual(mine.body.courses.map((c) => c.title), ['Mine archived', 'Visible']);

    const theirs = await request('/courses?includeArchived=true&sort=title', { headers: OTHER_AUTH });
    assert.deepEqual(theirs.body.courses.map((c) => c.title), ['Theirs archived', 'Visible']);
  });

  test('includeArchived requires authentication', async () => {
    const res = await request('/courses?includeArchived=true');
    assert.equal(res.status, 401);
    assert.deepEqual(res.body, { error: 'Access Denied' });
  });

  test('includeArchived=false behaves like the default', async () => {
    await makeCourse({ title: 'Hidden', archived: true });
    const { body } = await request('/courses?includeArchived=false', { headers: OWNER_AUTH });
    assert.equal(body.courses.length, 0);
  });

  test('search and pagination respect archive visibility', async () => {
    await makeCourse({ title: 'Needle one' });
    await makeCourse({ title: 'Needle two', archived: true });
    const { body } = await request('/courses?q=needle');
    assert.equal(body.pagination.total, 1);
  });

  test('GET /courses/:id of an archived course is visible to the owner only', async () => {
    const course = await makeCourse({ title: 'Secret', archived: true });
    assert.equal((await request(`/courses/${course.id}`, { headers: OWNER_AUTH })).status, 200);
    for (const headers of [{}, OTHER_AUTH]) {
      const res = await request(`/courses/${course.id}`, { headers });
      assert.equal(res.status, 404);
      assert.deepEqual(res.body, { error: 'Course Not Found' });
    }
  });

  test('archived cannot be set through create or update bodies', async () => {
    const created = await request('/courses', {
      method: 'POST', headers: OWNER_AUTH,
      body: { title: 'Sneaky', description: 'd', archived: true, userId: other.id },
    });
    assert.equal(created.status, 201);
    const course = await Course.findByPk(created.headers.get('location').split('/').pop());
    assert.equal(course.archived, false);
    assert.equal(course.userId, owner.id);

    const updated = await request(`/courses/${course.id}`, { method: 'PUT', headers: OWNER_AUTH, body: { archived: true, title: 'Renamed' } });
    assert.equal(updated.status, 204);
    await course.reload();
    assert.equal(course.archived, false);
    assert.equal(course.title, 'Renamed');
  });
});

describe('error standardization', () => {
  test('GET /courses/:id returns 404 { error } for an unknown id', async () => {
    const res = await request('/courses/12345');
    assert.equal(res.status, 404);
    assert.deepEqual(res.body, { error: 'Course Not Found' });
  });

  test('non-numeric ids return 404', async () => {
    const res = await request('/courses/abc');
    assert.equal(res.status, 404);
    assert.deepEqual(res.body, { error: 'Course Not Found' });
  });

  test('PUT and DELETE of an unknown course return 404', async () => {
    for (const method of ['PUT', 'DELETE']) {
      const res = await request('/courses/12345', { method, headers: OWNER_AUTH, body: method === 'PUT' ? { title: 'x' } : undefined });
      assert.equal(res.status, 404);
      assert.deepEqual(res.body, { error: 'Course Not Found' });
    }
  });

  test('validation failures return { errors: [...] } with 400', async () => {
    const res = await request('/courses', { method: 'POST', headers: OWNER_AUTH, body: {} });
    assert.equal(res.status, 400);
    assert.deepEqual(res.body.errors.sort(), ['A course description is required.', 'A title for the course is required.']);

    const course = await makeCourse({ title: 'Valid' });
    const put = await request(`/courses/${course.id}`, { method: 'PUT', headers: OWNER_AUTH, body: { title: '' } });
    assert.equal(put.status, 400);
    assert.deepEqual(put.body.errors, ['Please provide a title for the course.']);
  });

  test('user validation and duplicate email return { errors: [...] }', async () => {
    const bad = await request('/users', { method: 'POST', body: {} });
    assert.equal(bad.status, 400);
    assert.ok(bad.body.errors.length > 0);
    const dup = await request('/users', { method: 'POST', body: { firstName: 'a', lastName: 'b', emailAddress: 'owner@example.com', password: 'password1' } });
    assert.equal(dup.status, 400);
    assert.deepEqual(dup.body.errors, ['The email address you entered already exists.']);
  });

  test('403 for non-owners uses { error }', async () => {
    const course = await makeCourse({ title: 'Not yours' });
    for (const method of ['PUT', 'DELETE']) {
      const res = await request(`/courses/${course.id}`, { method, headers: OTHER_AUTH, body: method === 'PUT' ? { title: 'x' } : undefined });
      assert.equal(res.status, 403);
      assert.ok(res.body.error);
    }
  });

  test('401 uses { error }, including for invalid optional credentials', async () => {
    assert.deepEqual((await request('/users')).body, { error: 'Access Denied' });
    const res = await request('/courses', { headers: basic('owner@example.com', 'wrongpassword') });
    assert.equal(res.status, 401);
    assert.deepEqual(res.body, { error: 'Access Denied' });
  });

  test('unknown routes return 404 { error }', async () => {
    const res = await request('/nope');
    assert.equal(res.status, 404);
    assert.deepEqual(res.body, { error: 'Route Not Found' });
  });

  test('malformed JSON returns 400 { error }', async () => {
    const res = await fetch(`${baseUrl}/courses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...OWNER_AUTH },
      body: '{bad json',
    });
    assert.equal(res.status, 400);
    assert.deepEqual(await res.json(), { error: 'Invalid JSON body' });
  });
});

describe('migration', () => {
  test('adds the archived column and indexes to a legacy table, and is re-runnable', async () => {
    const qi = sequelize.getQueryInterface();
    await qi.dropTable('Courses');
    await sequelize.query(`CREATE TABLE Courses (
      id INTEGER PRIMARY KEY AUTOINCREMENT, title VARCHAR(255) NOT NULL, description TEXT NOT NULL,
      estimatedTime VARCHAR(255), materialsNeeded VARCHAR(255), createdAt DATETIME NOT NULL,
      updatedAt DATETIME NOT NULL, userId INTEGER NOT NULL)`);
    await sequelize.query(`INSERT INTO Courses (title, description, createdAt, updatedAt, userId)
      VALUES ('Legacy', 'old row', datetime('now'), datetime('now'), ${owner.id})`);

    await addArchivedAndIndexes.up(qi, Sequelize);
    await addArchivedAndIndexes.up(qi, Sequelize);

    assert.ok((await qi.describeTable('Courses')).archived);
    const names = (await qi.showIndex('Courses')).map((i) => i.name);
    for (const name of ['courses_title', 'courses_created_at', 'courses_archived_user_id']) {
      assert.ok(names.includes(name), `missing index ${name}`);
    }
    const [legacy] = await Course.findAll();
    assert.equal(legacy.archived, false);

    await addArchivedAndIndexes.down(qi);
    assert.equal((await qi.describeTable('Courses')).archived, undefined);
    await addArchivedAndIndexes.up(qi, Sequelize);
  });
});
