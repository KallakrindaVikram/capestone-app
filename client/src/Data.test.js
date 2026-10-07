import Data from './Data';

const jsonResponse = (status, body) => ({ status, json: () => Promise.resolve(body) });

describe('Data', () => {
  let data;

  beforeEach(() => {
    data = new Data();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    delete global.fetch;
  });

  describe('getCourses', () => {
    test('requests /courses with no query string by default', async () => {
      global.fetch.mockResolvedValue(jsonResponse(200, { courses: [], pagination: {} }));
      await data.getCourses();
      expect(global.fetch.mock.calls[0][0]).toBe('http://localhost:5000/api/courses');
    });

    test('builds the query string and omits empty values', async () => {
      global.fetch.mockResolvedValue(jsonResponse(200, { courses: [], pagination: {} }));
      await data.getCourses({ page: 2, limit: 9, q: 'node js', sort: '-title', includeArchived: false });
      expect(global.fetch.mock.calls[0][0]).toBe('http://localhost:5000/api/courses?page=2&limit=9&q=node+js&sort=-title');
    });

    test('sends Basic Auth when credentials are provided', async () => {
      global.fetch.mockResolvedValue(jsonResponse(200, { courses: [], pagination: {} }));
      await data.getCourses({ includeArchived: true }, { username: 'a@b.com', password: 'secret' });
      const [url, options] = global.fetch.mock.calls[0];
      expect(url).toContain('includeArchived=true');
      expect(options.headers.Authorization).toBe(`Basic ${btoa('a@b.com:secret')}`);
    });

    test('returns the courses and pagination from the response', async () => {
      const body = { courses: [{ id: 1 }], pagination: { page: 1, total: 1, totalPages: 1 } };
      global.fetch.mockResolvedValue(jsonResponse(200, body));
      await expect(data.getCourses()).resolves.toEqual(body);
    });

    test('throws on a failed response', async () => {
      global.fetch.mockResolvedValue(jsonResponse(400, { errors: ['bad'] }));
      await expect(data.getCourses({ page: 1 })).rejects.toThrow();
    });
  });

  describe('getCourse', () => {
    test('returns the course', async () => {
      global.fetch.mockResolvedValue(jsonResponse(200, { id: 3 }));
      await expect(data.getCourse('3')).resolves.toEqual({ id: 3 });
    });

    test('returns null for a 404', async () => {
      global.fetch.mockResolvedValue(jsonResponse(404, { error: 'Course Not Found' }));
      await expect(data.getCourse('99')).resolves.toBeNull();
    });

    test('throws for other failures', async () => {
      global.fetch.mockResolvedValue(jsonResponse(500, { error: 'Internal Server Error' }));
      await expect(data.getCourse('1')).rejects.toThrow();
    });
  });

  describe('archive and unarchive', () => {
    test('POST to the archive endpoint with credentials', async () => {
      global.fetch.mockResolvedValue({ status: 204 });
      await expect(data.archiveCourse('5', 'a@b.com', 'secret')).resolves.toEqual([]);
      const [url, options] = global.fetch.mock.calls[0];
      expect(url).toBe('http://localhost:5000/api/courses/5/archive');
      expect(options.method).toBe('POST');
      expect(options.headers.Authorization).toBe(`Basic ${btoa('a@b.com:secret')}`);
    });

    test('POST to the unarchive endpoint', async () => {
      global.fetch.mockResolvedValue({ status: 204 });
      await data.unarchiveCourse('5', 'a@b.com', 'secret');
      expect(global.fetch.mock.calls[0][0]).toBe('http://localhost:5000/api/courses/5/unarchive');
    });

    test('returns the error message for 403 and 404', async () => {
      global.fetch.mockResolvedValue(jsonResponse(403, { error: 'You are not authorised to archive this course.' }));
      await expect(data.archiveCourse('5', 'a@b.com', 'x')).resolves.toEqual(['You are not authorised to archive this course.']);
      global.fetch.mockResolvedValue(jsonResponse(404, { error: 'Course Not Found' }));
      await expect(data.unarchiveCourse('5', 'a@b.com', 'x')).resolves.toEqual(['Course Not Found']);
    });

    test('throws on unexpected statuses', async () => {
      global.fetch.mockResolvedValue(jsonResponse(500, {}));
      await expect(data.archiveCourse('5', 'a@b.com', 'x')).rejects.toThrow();
    });
  });

  test('getUser returns the 401 body so the UI can show an error', async () => {
    global.fetch.mockResolvedValue(jsonResponse(401, { error: 'Access Denied' }));
    await expect(data.getUser('a@b.com', 'bad')).resolves.toEqual({ error: 'Access Denied' });
  });
});
