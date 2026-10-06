import config from './config';

export default class Data {
  /**
   * Function to make Fetch requests to our custom REST API
   * @param {*} path - route or path to API endpoint e.g. /courses, /users
   * @param {*} method - e.g. POST, GET
   * @param {*} body - body of the request (optional)
   * @param {*} requiresAuth - whether the API request requires authentication
   * @param {*} credentials - if API request requires authentication, enter in user's credentials (username/email address and password)
   * @returns {function} Make the Fetch API request
   */
  api(path, method = 'GET', body = null, requiresAuth = false, credentials = null) {
    const url = config.apiBaseUrl + path;

    const options = {
      method,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
    };

    if (body !== null) {
      options.body = JSON.stringify(body);
    }

    if (requiresAuth) {
      const encodedCredentials = btoa(`${credentials.username}:${credentials.password}`);
      options.headers['Authorization'] = `Basic ${encodedCredentials}`;
    }
    return fetch(url, options);
  }

  /**
   * Get the user from the database for Sign In
   * @param {String} username - for Authentication, the user's email address acts as the "username"
   * @param {String} password 
   * @returns API response if successful
   */
  async getUser(username, password) {
    const response = await this.api(`/users`, 'GET', null, true, { username, password });
    if (response.status === 200) {
      return response.json().then(data => data);
    }
    else if (response.status === 401) {
      return response.json().then(message => message);
    }
    else {
      throw new Error();
    }
  }

  /**
   * Create a new user in the database
   * @param {Object} user 
   * @returns empty response if successful
   */
  async createUser(user) {
    const response = await this.api('/users', 'POST', user);
    if (response.status === 201) {
      return [];
    }
    else if (response.status === 400) {
      return response.json().then(data => {
        return data.errors;
      });
    }
    else {
      throw new Error();
    }
  }

  /**
   * Get all available courses
   * @returns API response if successful
   */
  async getCourses() {
    const response = await this.api('/courses', 'GET', null, false);
    if (response.status === 200) {
      return response.json().then(data => data);
    } else {
      throw new Error();
    }
  }

  /**
   * List courses with optional search, sort and pagination
   * @param {Object} params - any of q, sort, page, pageSize, userId; empty values are omitted
   * @returns {Object} { data: courses for the requested page, totalCount: number of matching courses }
   */
  async listCourses(params = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        query.set(key, value);
      }
    });
    const queryString = query.toString();
    const response = await this.api(`/courses${queryString ? `?${queryString}` : ''}`, 'GET', null, false);
    if (response.status === 200) {
      const data = await response.json();
      const totalCount = parseInt(response.headers.get('X-Total-Count'), 10);
      return { data, totalCount: Number.isNaN(totalCount) ? data.length : totalCount };
    } else if (response.status === 400) {
      const body = await response.json().catch(() => ({}));
      throw Object.assign(new Error('Invalid course query'), { status: 400, errors: body.errors || [] });
    } else {
      throw Object.assign(new Error(), { status: response.status });
    }
  }

  /**
   * Get the authenticated user's favorited courses
   * @param {String} username - user's email address
   * @param {String} password
   * @returns {Array} favorited courses
   */
  async getMyFavorites(username, password) {
    const response = await this.api('/users/me/favorites', 'GET', null, true, { username, password });
    if (response.status === 200) {
      return response.json();
    } else {
      throw Object.assign(new Error(), { status: response.status });
    }
  }

  /**
   * Add a course to the authenticated user's favorites (idempotent)
   * @param {String} courseId
   * @param {String} username - user's email address
   * @param {String} password
   */
  async favoriteCourse(courseId, username, password) {
    const response = await this.api(`/courses/${courseId}/favorite`, 'POST', null, true, { username, password });
    if (response.status !== 204) {
      throw Object.assign(new Error(), { status: response.status });
    }
  }

  /**
   * Remove a course from the authenticated user's favorites (idempotent)
   * @param {String} courseId
   * @param {String} username - user's email address
   * @param {String} password
   */
  async unfavoriteCourse(courseId, username, password) {
    const response = await this.api(`/courses/${courseId}/favorite`, 'DELETE', null, true, { username, password });
    if (response.status !== 204) {
      throw Object.assign(new Error(), { status: response.status });
    }
  }

  /**
   * Get a specific course by id
   * @param {String} id - Course ID
   * @returns API response if successful
   */
  async getCourse(id) {
    const response = await this.api(`/courses/${id}`, 'GET', null, false);
    if (response.status === 200) {
      return response.json().then(data => data);
    } else {
      throw new Error();
    }
  }

  /**
   * Create a new course
   * @param {Object} course - with title, description, estimated time and materials needed
   * @param {String} username - user's email address
   * @param {String} password 
   * @returns empty response if successful
   */
  async createCourse(course, username, password) {
    const response = await this.api('/courses', 'POST', course, true, { username, password });
    if (response.status === 201) {
      return [];
    }
    else if (response.status === 400) {
      return response.json().then(data => {
        return data.errors;
      });
    }
    else {
      throw new Error();
    }
  }

  /**
   * Delete a specific course
   * Only users who are authors of the course are authorised to delete the course
   * @param {String} id - Course ID
   * @param {String} username - user's email address
   * @param {String} password 
   * @returns empty response if successful
   */
  async deleteCourse(id, username, password) {
    const response = await this.api(`/courses/${id}`, 'DELETE', null, true, { username, password });
    if (response.status === 204) {
      return [];
    }
    else if (response.status === 400) {
      return response.json().then(data => {
        return data.errors;
      });
    }
    else {
      throw new Error();
    }
  }

  /**
   * Update a particular course
   * @param {String} id - Course ID
   * @param {Object} course - with updated title, description, estimated time and materials needed
   * @param {String} username - user's email address
   * @param {String} password 
   * @returns empty response if successful
   */
  async updateCourse(id, course, username, password) {
    const response = await this.api(`/courses/${id}`, 'PUT', course, true, { username, password });
    if (response.status === 204) {
      return [];
    }
    else if (response.status === 400) {
      return response.json().then(data => {
        return data.errors;
      });
    }
    else {
      throw new Error();
    }
  }
}
