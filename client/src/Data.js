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
      return response.json().then(data => data);
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
   * Get a page of courses
   * @param {Object} options
   * @param {Number} options.page - 1-based page number
   * @param {Number} options.limit - courses per page
   * @param {String} options.q - keyword to search title and description
   * @param {String} options.sort - id, title, createdAt, optionally prefixed with "-" for descending
   * @param {Boolean} options.includeArchived - include the signed-in user's archived courses (requires credentials)
   * @param {Object} credentials - optional { username, password }
   * @returns {Object} { courses, pagination: { page, limit, total, totalPages } }
   */
  async getCourses({ page, limit, q, sort, includeArchived } = {}, credentials = null) {
    const params = new URLSearchParams();
    if (page) params.set('page', page);
    if (limit) params.set('limit', limit);
    if (q) params.set('q', q);
    if (sort) params.set('sort', sort);
    if (includeArchived) params.set('includeArchived', 'true');
    const queryString = params.toString();

    const path = `/courses${queryString ? `?${queryString}` : ''}`;
    const response = await this.api(path, 'GET', null, !!credentials, credentials);
    if (response.status === 200) {
      return response.json();
    } else {
      throw new Error(`Unable to load courses (${response.status})`);
    }
  }

  /**
   * Get a specific course by id
   * @param {String} id - Course ID
   * @param {Object} credentials - optional { username, password }; needed to view your own archived course
   * @returns the course, or null if it does not exist (or is archived and not yours)
   */
  async getCourse(id, credentials = null) {
    const response = await this.api(`/courses/${id}`, 'GET', null, !!credentials, credentials);
    if (response.status === 200) {
      return response.json();
    } else if (response.status === 404) {
      return null;
    } else {
      throw new Error(`Unable to load course (${response.status})`);
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

  /**
   * Archive a course (soft delete). Only the course author is authorised.
   * @param {String} id - Course ID
   * @param {String} username - user's email address
   * @param {String} password
   * @returns empty array if successful, otherwise an array containing the error message
   */
  archiveCourse(id, username, password) {
    return this.setArchived(id, 'archive', username, password);
  }

  /**
   * Restore an archived course. Only the course author is authorised.
   * @param {String} id - Course ID
   * @param {String} username - user's email address
   * @param {String} password
   * @returns empty array if successful, otherwise an array containing the error message
   */
  unarchiveCourse(id, username, password) {
    return this.setArchived(id, 'unarchive', username, password);
  }

  async setArchived(id, action, username, password) {
    const response = await this.api(`/courses/${id}/${action}`, 'POST', null, true, { username, password });
    if (response.status === 204) {
      return [];
    }
    else if (response.status === 403 || response.status === 404) {
      return response.json().then(data => [data.error]);
    }
    else {
      throw new Error(`Unable to ${action} course (${response.status})`);
    }
  }
}
