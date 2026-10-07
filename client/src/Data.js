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
   * Get a page of courses, optionally searched, filtered by owner and sorted
   * @param {Object} options - { q, ownerId, sort, page, pageSize }; empty values are omitted
   * @returns {Object} { items, meta } if successful
   */
  async getCourses({ q, ownerId, sort, page, pageSize } = {}) {
    const params = new URLSearchParams();
    Object.entries({ q, ownerId, sort, page, pageSize }).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.set(key, value);
      }
    });
    const query = params.toString();
    const response = await this.api(`/courses${query ? `?${query}` : ''}`, 'GET', null, false);
    if (response.status === 200) {
      return response.json().then(data => data);
    } else {
      throw new Error();
    }
  }

  /**
   * Get the users who own courses, for the catalog owner filter
   * @returns {Array} owners ({ id, firstName, lastName })
   */
  async getOwners() {
    const response = await this.api('/owners', 'GET', null, false);
    if (response.status === 200) {
      return response.json().then(data => data.items);
    } else {
      throw new Error();
    }
  }

  /**
   * Get a specific course by id
   * @param {String} id - Course ID
   * @param {String} username - optional; when supplied the response includes isFavorited for this user
   * @param {String} password
   * @returns the course if successful, or null if the course does not exist
   */
  async getCourse(id, username = null, password = null) {
    const requiresAuth = !!username;
    const response = await this.api(`/courses/${id}`, 'GET', null, requiresAuth, requiresAuth ? { username, password } : null);
    if (response.status === 200) {
      return response.json().then(data => data);
    } else if (response.status === 404) {
      return null;
    } else {
      throw new Error();
    }
  }

  /**
   * Add a course to the user's favorites
   * @param {String} id - Course ID
   * @param {String} username - user's email address
   * @param {String} password
   */
  async favoriteCourse(id, username, password) {
    const response = await this.api(`/courses/${id}/favorite`, 'POST', null, true, { username, password });
    if (response.status !== 204) {
      throw new Error(`Unable to favorite course (${response.status})`);
    }
  }

  /**
   * Remove a course from the user's favorites
   * @param {String} id - Course ID
   * @param {String} username - user's email address
   * @param {String} password
   */
  async unfavoriteCourse(id, username, password) {
    const response = await this.api(`/courses/${id}/favorite`, 'DELETE', null, true, { username, password });
    if (response.status !== 204) {
      throw new Error(`Unable to unfavorite course (${response.status})`);
    }
  }

  /**
   * Get the authenticated user's favorite courses
   * @param {String} username - user's email address
   * @param {String} password
   * @returns {Array} courses
   */
  async getFavorites(username, password) {
    const response = await this.api('/users/me/favorites', 'GET', null, true, { username, password });
    if (response.status === 200) {
      return response.json().then(data => data.items);
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
