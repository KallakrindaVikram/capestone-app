import Data from './Data';

const respond = (status, body) => Promise.resolve({ status, json: () => Promise.resolve(body) });

describe('Data.getCourses', () => {
  let data;

  beforeEach(() => {
    data = new Data();
    global.fetch = jest.fn(() => respond(200, []));
  });

  afterEach(() => {
    delete global.fetch;
  });

  const requestedUrl = () => global.fetch.mock.calls[0][0];

  test('requests /courses with no query string when no params are given', async () => {
    await data.getCourses();
    expect(requestedUrl()).toMatch(/\/courses$/);
  });

  test('omits empty params', async () => {
    await data.getCourses({ q: '', userId: '', sort: '', order: '' });
    expect(requestedUrl()).toMatch(/\/courses$/);
  });

  test('sends q, userId, sort and order, URL-encoded', async () => {
    await data.getCourses({ q: 'SQL basics & more', userId: '2', sort: 'title', order: 'asc' });
    const url = new URL(requestedUrl());
    expect(url.pathname).toBe('/api/courses');
    expect(Object.fromEntries(url.searchParams)).toEqual({ q: 'SQL basics & more', userId: '2', sort: 'title', order: 'asc' });
  });

  test('ignores params outside the supported set', async () => {
    await data.getCourses({ q: 'a', bogus: 'x' });
    expect(requestedUrl()).not.toContain('bogus');
  });

  test('returns the parsed body on 200', async () => {
    global.fetch = jest.fn(() => respond(200, [{ id: 1 }]));
    await expect(data.getCourses()).resolves.toEqual([{ id: 1 }]);
  });

  test('rejects with status and errors on 400', async () => {
    global.fetch = jest.fn(() => respond(400, { errors: ['Invalid sort value. Allowed: title, updatedAt'] }));
    await expect(data.getCourses({ sort: 'x' })).rejects.toMatchObject({
      status: 400,
      errors: ['Invalid sort value. Allowed: title, updatedAt'],
    });
  });

  test('rejects on other statuses', async () => {
    global.fetch = jest.fn(() => respond(500, {}));
    await expect(data.getCourses()).rejects.toThrow();
  });
});
