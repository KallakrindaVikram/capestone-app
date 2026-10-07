'use strict';

const os = require('os');
const path = require('path');
const fs = require('fs');

// Must be set before the models are loaded so tests never touch the development database
const dbFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'catalog-api-')), 'test.db');
process.env.DB_STORAGE = dbFile;

const { test, before, after, describe } = require('node:test');
const assert = require('node:assert/strict');

const app = require('../app');
const { sequelize, User, Course, Favorite } = require('../models');

let server;
let base;
const users = {};

const basic = (email, password) => ({
  Authorization: `Basic ${Buffer.from(`${email}:${password}`).toString('base64')}`
});
const asAlex = basic('alex@test.com', 'alexpassword');
const asBella = basic('bella@test.com', 'bellapassword');

const get = (url, headers = {}) => fetch(`${base}${url}`, { headers });
const getJson = async (url, headers) => {
  const res = await get(url, headers);
  return { status: res.status, body: await res.json() };
};

before(async () => {
  await sequelize.sync({ force: true });

  users.alex = await User.create({ firstName: 'Alex', lastName: 'Ames', emailAddress: 'alex@test.com', password: 'alexpassword' });
  users.bella = await User.create({ firstName: 'Bella', lastName: 'Bell', emailAddress: 'bella@test.com', password: 'bellapassword' });

  // 15 courses: Alex owns 1-10, Bella owns 11-15. Higher id => newer.
  const titles = [
    'React Basics', 'react hooks', 'Node Intro', 'Advanced CSS', 'zebra patterns',
    'Python 101', 'SQL Basics', 'Docker 100% Guide', 'apple pie coding', 'Mango Testing',
    'Banana Design', 'Cherry Security', 'Date Handling', 'Elderberry Ops', 'Fig Networking'
  ];
  for (const [index, title] of titles.entries()) {
    await Course.create({
      title,
      description: index === 2 ? 'Build servers with REACT-free tooling' : `Description number ${index + 1}`,
      userId: index < 10 ? users.alex.id : users.bella.id,
      createdAt: new Date(Date.UTC(2026, 0, index + 1))
    });
  }

  server = app.listen(0);
  base = `http://127.0.0.1:${server.address().port}/api`;
});

after(async () => {
  server.close();
  await sequelize.close();
  fs.rmSync(path.dirname(dbFile), { recursive: true, force: true });
});

describe('GET /courses - pagination and search', () => {
  test('returns items with default pagination meta', async () => {
    const { status, body } = await getJson('/courses');
    assert.equal(status, 200);
    assert.equal(body.items.length, 12);
    assert.deepEqual(body.meta, {
      totalCount: 15, page: 1, pageSize: 12, totalPages: 2,
      sortApplied: 'newest', qApplied: null, ownerIdApplied: null
    });
    assert.ok(body.items[0].User.emailAddress);
    assert.equal(body.items[0].User.password, undefined);
  });

  test('second page returns the remainder', async () => {
    const { body } = await getJson('/courses?page=2');
    assert.equal(body.items.length, 3);
    assert.equal(body.meta.page, 2);
  });

  test('respects pageSize and clamps it to 50', async () => {
    assert.equal((await getJson('/courses?pageSize=5')).body.meta.totalPages, 3);
    const big = await getJson('/courses?pageSize=500');
    assert.equal(big.body.meta.pageSize, 50);
    assert.equal(big.body.items.length, 15);
    assert.equal((await getJson('/courses?pageSize=abc')).body.meta.pageSize, 12);
  });

  test('invalid page values fall back to page 1', async () => {
    for (const page of ['abc', '0', '-3', '1.5', '']) {
      const { body } = await getJson(`/courses?page=${page}`);
      assert.equal(body.meta.page, 1, `page=${page}`);
    }
  });

  test('a page beyond the last page falls back to the last page', async () => {
    const { body } = await getJson('/courses?page=99');
    assert.equal(body.meta.page, 2);
    assert.equal(body.items.length, 3);
  });

  test('search matches title and description case-insensitively', async () => {
    const { body } = await getJson('/courses?q=ReAcT');
    const titles = body.items.map(c => c.title).sort();
    assert.deepEqual(titles, ['Node Intro', 'React Basics', 'react hooks']);
    assert.equal(body.meta.totalCount, 3);
    assert.equal(body.meta.qApplied, 'ReAcT');
  });

  test('search trims whitespace and an empty q means no search', async () => {
    assert.equal((await getJson('/courses?q=%20%20react%20')).body.meta.totalCount, 3);
    const blank = await getJson('/courses?q=%20%20');
    assert.equal(blank.body.meta.totalCount, 15);
    assert.equal(blank.body.meta.qApplied, null);
  });

  test('LIKE wildcards in the query are treated literally', async () => {
    assert.equal((await getJson('/courses?q=100%25')).body.meta.totalCount, 1);
    assert.equal((await getJson('/courses?q=%25')).body.meta.totalCount, 1);
    assert.equal((await getJson('/courses?q=_')).body.meta.totalCount, 0);
  });

  test('no matches returns an empty list with zero totals', async () => {
    const { status, body } = await getJson('/courses?q=nothingmatchesthis');
    assert.equal(status, 200);
    assert.deepEqual(body.items, []);
    assert.equal(body.meta.totalCount, 0);
    assert.equal(body.meta.totalPages, 0);
    assert.equal(body.meta.page, 1);
  });

  test('search is combined with pagination', async () => {
    const { body } = await getJson('/courses?q=react&pageSize=2&page=2');
    assert.equal(body.items.length, 1);
    assert.equal(body.meta.totalPages, 2);
  });
});

describe('GET /courses - owner filter and sort', () => {
  test('filters by ownerId', async () => {
    const { body } = await getJson(`/courses?ownerId=${users.bella.id}`);
    assert.equal(body.meta.totalCount, 5);
    assert.ok(body.items.every(c => c.User.id === users.bella.id));
    assert.equal(body.meta.ownerIdApplied, users.bella.id);
  });

  test('rejects an invalid ownerId with 400', async () => {
    for (const ownerId of ['abc', '0', '-1', '1.5']) {
      const { status, body } = await getJson(`/courses?ownerId=${ownerId}`);
      assert.equal(status, 400, `ownerId=${ownerId}`);
      assert.deepEqual(body, { errors: ['Invalid ownerId'] });
    }
  });

  test('an unknown but valid ownerId returns an empty list', async () => {
    const { status, body } = await getJson('/courses?ownerId=9999');
    assert.equal(status, 200);
    assert.equal(body.meta.totalCount, 0);
  });

  test('a blank ownerId is ignored', async () => {
    assert.equal((await getJson('/courses?ownerId=')).body.meta.totalCount, 15);
  });

  test('defaults to newest first', async () => {
    const { body } = await getJson('/courses');
    assert.equal(body.meta.sortApplied, 'newest');
    assert.equal(body.items[0].title, 'Fig Networking');
    const ids = body.items.map(c => c.id);
    assert.deepEqual(ids, [...ids].sort((a, b) => b - a));
  });

  test('title_asc sorts alphabetically ignoring case', async () => {
    const { body } = await getJson('/courses?sort=title_asc&pageSize=50');
    const titles = body.items.map(c => c.title);
    assert.deepEqual(titles, [...titles].sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase())));
    assert.equal(titles[0], 'Advanced CSS');
    assert.equal(titles[1], 'apple pie coding');
    assert.equal(body.meta.sortApplied, 'title_asc');
  });

  test('an invalid sort defaults to newest', async () => {
    const { body } = await getJson('/courses?sort=bogus');
    assert.equal(body.meta.sortApplied, 'newest');
    assert.equal(body.items[0].title, 'Fig Networking');
    const proto = await getJson('/courses?sort=constructor');
    assert.equal(proto.body.meta.sortApplied, 'newest');
  });

  test('sort applies to filtered results', async () => {
    const { body } = await getJson(`/courses?ownerId=${users.alex.id}&q=react&sort=title_asc`);
    assert.deepEqual(body.items.map(c => c.title), ['Node Intro', 'React Basics', 'react hooks']);
  });
});

describe('GET /courses/:id', () => {
  test('returns 404 with an error body for an unknown course', async () => {
    const { status, body } = await getJson('/courses/9999');
    assert.equal(status, 404);
    assert.deepEqual(body, { error: 'Course Not Found' });
  });

  test('returns isFavorited=false when anonymous', async () => {
    const { status, body } = await getJson('/courses/1');
    assert.equal(status, 200);
    assert.equal(body.isFavorited, false);
    assert.equal(body.User.password, undefined);
  });

  test('ignores invalid credentials instead of failing', async () => {
    const { status, body } = await getJson('/courses/1', basic('alex@test.com', 'wrong'));
    assert.equal(status, 200);
    assert.equal(body.isFavorited, false);
  });
});

describe('favorites', () => {
  test('POST /courses/:id/favorite requires authentication', async () => {
    const res = await fetch(`${base}/courses/1/favorite`, { method: 'POST' });
    assert.equal(res.status, 401);
  });

  test('DELETE /courses/:id/favorite requires authentication', async () => {
    const res = await fetch(`${base}/courses/1/favorite`, { method: 'DELETE' });
    assert.equal(res.status, 401);
  });

  test('GET /users/me/favorites requires authentication', async () => {
    assert.equal((await get('/users/me/favorites')).status, 401);
  });

  test('favoriting returns 204, is idempotent and never duplicates rows', async () => {
    for (let i = 0; i < 2; i++) {
      const res = await fetch(`${base}/courses/2/favorite`, { method: 'POST', headers: asAlex });
      assert.equal(res.status, 204);
    }
    assert.equal(await Favorite.count({ where: { userId: users.alex.id, courseId: 2 } }), 1);
  });

  test('the database enforces uniqueness of (userId, courseId)', async () => {
    await assert.rejects(Favorite.create({ userId: users.alex.id, courseId: 2 }), /Validation error|UNIQUE/i);
  });

  test('course detail reports isFavorited per user', async () => {
    assert.equal((await getJson('/courses/2', asAlex)).body.isFavorited, true);
    assert.equal((await getJson('/courses/2', asBella)).body.isFavorited, false);
  });

  test('favoriting an unknown course returns 404', async () => {
    const res = await fetch(`${base}/courses/9999/favorite`, { method: 'POST', headers: asAlex });
    assert.equal(res.status, 404);
    assert.deepEqual(await res.json(), { error: 'Course Not Found' });
  });

  test('GET /users/me/favorites lists only the current user favorites with owner data', async () => {
    await fetch(`${base}/courses/12/favorite`, { method: 'POST', headers: asAlex });
    await fetch(`${base}/courses/3/favorite`, { method: 'POST', headers: asBella });

    const alex = await getJson('/users/me/favorites', asAlex);
    assert.equal(alex.status, 200);
    assert.deepEqual(alex.body.items.map(c => c.id).sort((a, b) => a - b), [2, 12]);
    assert.ok(alex.body.items[0].User.firstName);
    assert.equal(alex.body.items[0].User.password, undefined);
    assert.equal(alex.body.items[0].Favorites, undefined);

    const bella = await getJson('/users/me/favorites', asBella);
    assert.deepEqual(bella.body.items.map(c => c.id), [3]);
  });

  test('unfavoriting returns 204 and is idempotent', async () => {
    for (let i = 0; i < 2; i++) {
      const res = await fetch(`${base}/courses/2/favorite`, { method: 'DELETE', headers: asAlex });
      assert.equal(res.status, 204);
    }
    assert.equal((await getJson('/courses/2', asAlex)).body.isFavorited, false);
  });

  test('unfavoriting an unknown course returns 404', async () => {
    const res = await fetch(`${base}/courses/9999/favorite`, { method: 'DELETE', headers: asAlex });
    assert.equal(res.status, 404);
  });

  test('deleting a course cascades to its favorites', async () => {
    // Bella owns course 12; Alex has favorited it
    assert.equal(await Favorite.count({ where: { courseId: 12 } }), 1);
    const res = await fetch(`${base}/courses/12`, { method: 'DELETE', headers: asBella });
    assert.equal(res.status, 204);
    assert.equal(await Favorite.count({ where: { courseId: 12 } }), 0);
    assert.deepEqual((await getJson('/users/me/favorites', asAlex)).body.items, []);
  });

  test('deleting a user cascades to their favorites', async () => {
    assert.equal(await Favorite.count({ where: { userId: users.bella.id } }), 1);
    await users.bella.destroy();
    assert.equal(await Favorite.count({ where: { userId: users.bella.id } }), 0);
  });
});

describe('GET /owners', () => {
  test('lists users who own courses', async () => {
    const { status, body } = await getJson('/owners');
    assert.equal(status, 200);
    assert.ok(body.items.length >= 1);
    assert.deepEqual(Object.keys(body.items[0]).sort(), ['firstName', 'id', 'lastName']);
  });
});
