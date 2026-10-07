'use strict';

// Run with `npm test` from /api. The integration section expects the DB created by `npm run seed`.
const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');

const { buildCourseQuery } = require('../utils/course-query');
const courseRouter = require('../routes/courses');

describe('buildCourseQuery', () => {
  test('no params -> no filters, id ASC', () => {
    const result = buildCourseQuery({});
    assert.deepEqual(result.where, {});
    assert.deepEqual(result.order, [['id', 'ASC']]);
  });

  test('empty / whitespace q is treated as not provided', () => {
    assert.deepEqual(buildCourseQuery({ q: '   ' }).where, {});
    assert.deepEqual(buildCourseQuery({ q: '' }).where, {});
  });

  test('q longer than 100 chars is rejected', () => {
    assert.equal(buildCourseQuery({ q: 'a'.repeat(100) }).errors, undefined);
    assert.equal(buildCourseQuery({ q: 'a'.repeat(101) }).errors.length, 1);
  });

  test('repeated q (array) is rejected', () => {
    assert.equal(buildCourseQuery({ q: ['a', 'b'] }).errors.length, 1);
  });

  test('userId must be a positive integer', () => {
    for (const bad of ['0', '-1', '1.5', 'abc', '1abc', '', ['1', '2']]) {
      assert.equal(buildCourseQuery({ userId: bad }).errors.length, 1, `userId=${bad}`);
    }
    assert.deepEqual(buildCourseQuery({ userId: '2' }).where.constructor, Object);
  });

  test('sort / order allowlists', () => {
    assert.deepEqual(buildCourseQuery({ sort: 'password' }).errors, ['Invalid sort value. Allowed: title, updatedAt']);
    assert.deepEqual(buildCourseQuery({ order: 'up' }).errors, ['Invalid order value. Allowed: asc, desc']);
    assert.equal(buildCourseQuery({ sort: 'bad', order: 'bad' }).errors.length, 2);
  });

  test('order defaults per sort field', () => {
    assert.equal(buildCourseQuery({ sort: 'title' }).order[0][1], 'ASC');
    assert.deepEqual(buildCourseQuery({ sort: 'updatedAt' }).order[0], ['updatedAt', 'DESC']);
    assert.equal(buildCourseQuery({ sort: 'title', order: 'desc' }).order[0][1], 'DESC');
    assert.deepEqual(buildCourseQuery({ order: 'desc' }).order, [['id', 'DESC']]);
  });
});

describe('GET /api/courses (seeded database)', () => {
  let server;
  let base;

  before(async () => {
    const app = express();
    app.use('/api', courseRouter);
    await new Promise((resolve) => { server = app.listen(0, resolve); });
    base = `http://127.0.0.1:${server.address().port}/api/courses`;
  });

  after(() => new Promise((resolve) => server.close(resolve)));

  const get = async (qs = '') => {
    const res = await fetch(base + qs);
    return { status: res.status, body: await res.json() };
  };
  const titles = (body) => body.map((c) => c.title);

  test('no params returns every course with updatedAt and without password', async () => {
    const { status, body } = await get();
    assert.equal(status, 200);
    assert.equal(body.length, 10);
    assert.ok(body.every((c) => c.updatedAt));
    assert.ok(body.every((c) => !('createdAt' in c)));
    assert.ok(body.every((c) => c.User && !('password' in c.User)));
  });

  test('q matches title or description, case-insensitively', async () => {
    const react = await get('?q=REACT');
    assert.deepEqual(titles(react.body), ['React Fundamentals', 'Advanced React Patterns']);

    const sqlite = await get('?q=sqlite');
    assert.deepEqual(titles(sqlite.body), ['SQL Basics', 'Sequelize ORM in Practice']);
  });

  test('q is trimmed; blank q returns the full list', async () => {
    assert.equal((await get('?q=%20react%20')).body.length, 2);
    assert.equal((await get('?q=')).body.length, 10);
    assert.equal((await get('?q=%20%20')).body.length, 10);
  });

  test('q treats % and _ literally', async () => {
    assert.deepEqual((await get('?q=%25')).body, []);
    assert.deepEqual((await get('?q=_')).body, []);
  });

  test('q with no match returns 200 and []', async () => {
    const { status, body } = await get('?q=zzzznomatch');
    assert.equal(status, 200);
    assert.deepEqual(body, []);
  });

  test('q too long returns 400 { errors }', async () => {
    const { status, body } = await get(`?q=${'a'.repeat(101)}`);
    assert.equal(status, 400);
    assert.ok(Array.isArray(body.errors) && body.errors.length === 1);
  });

  test('userId filters by author', async () => {
    const { body } = await get('?userId=2');
    assert.equal(body.length, 5);
    assert.ok(body.every((c) => c.User.id === 2));
  });

  test('unknown userId returns 200 and []', async () => {
    const { status, body } = await get('?userId=9999');
    assert.equal(status, 200);
    assert.deepEqual(body, []);
  });

  test('invalid userId returns 400', async () => {
    for (const bad of ['abc', '0', '-3', '1.2']) {
      const { status, body } = await get(`?userId=${bad}`);
      assert.equal(status, 400, `userId=${bad}`);
      assert.ok(body.errors.length);
    }
  });

  test('sort=title&order=asc / desc', async () => {
    const asc = titles((await get('?sort=title&order=asc')).body);
    assert.deepEqual(asc, [...asc].sort((a, b) => a.localeCompare(b)));
    const desc = titles((await get('?sort=title&order=desc')).body);
    assert.deepEqual(desc, [...asc].reverse());
  });

  test('sort=updatedAt&order=desc puts newest first; asc puts oldest first', async () => {
    const desc = (await get('?sort=updatedAt&order=desc')).body;
    assert.equal(desc[0].title, 'Sequelize ORM in Practice');
    assert.equal(desc[desc.length - 1].title, 'Advanced React Patterns');
    const stamps = desc.map((c) => new Date(c.updatedAt).getTime());
    assert.deepEqual(stamps, [...stamps].sort((a, b) => b - a));

    const asc = (await get('?sort=updatedAt&order=asc')).body;
    assert.equal(asc[0].title, 'Advanced React Patterns');
  });

  test('invalid sort or order returns 400 { errors }', async () => {
    const sort = await get('?sort=password');
    assert.equal(sort.status, 400);
    assert.deepEqual(sort.body, { errors: ['Invalid sort value. Allowed: title, updatedAt'] });

    const order = await get('?sort=title&order=sideways');
    assert.equal(order.status, 400);
    assert.deepEqual(order.body, { errors: ['Invalid order value. Allowed: asc, desc'] });
  });

  test('filters combine (AND)', async () => {
    const { body } = await get('?q=react&userId=2&sort=title&order=asc');
    assert.deepEqual(titles(body), ['Advanced React Patterns']);
  });

  test('SQL injection attempts are inert', async () => {
    const { status, body } = await get(`?q=${encodeURIComponent("'; DROP TABLE Courses;--")}`);
    assert.equal(status, 200);
    assert.deepEqual(body, []);
    assert.equal((await get()).body.length, 10);
  });
});
