'use strict';

const { ApiError } = require('./errors');

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;
const MAX_QUERY_LENGTH = 100;
const SORT_FIELDS = ['id', 'title', 'createdAt'];
const DEFAULT_SORT = 'id';

const isPositiveInt = (value) => /^\d+$/.test(value) && Number(value) >= 1;

/**
 * Validate and normalise the query string of GET /courses.
 * Returns { page, limit, q, sortField, sortDirection, includeArchived }.
 * Throws ApiError(400, ..., errors[]) when any parameter is invalid.
 */
const parseCourseQuery = (query) => {
  const errors = [];
  const single = (name) => {
    const value = query[name];
    if (Array.isArray(value)) {
      errors.push(`"${name}" may only be provided once.`);
      return undefined;
    }
    return value;
  };

  let page = DEFAULT_PAGE;
  const rawPage = single('page');
  if (rawPage !== undefined) {
    if (isPositiveInt(rawPage)) page = Number(rawPage);
    else errors.push('"page" must be a positive integer.');
  }

  let limit = DEFAULT_LIMIT;
  const rawLimit = single('limit');
  if (rawLimit !== undefined) {
    if (isPositiveInt(rawLimit) && Number(rawLimit) <= MAX_LIMIT) limit = Number(rawLimit);
    else errors.push(`"limit" must be an integer between 1 and ${MAX_LIMIT}.`);
  }

  let q = '';
  const rawQ = single('q');
  if (rawQ !== undefined) {
    if (typeof rawQ !== 'string') errors.push('"q" must be a string.');
    else if (rawQ.trim().length > MAX_QUERY_LENGTH) errors.push(`"q" must be at most ${MAX_QUERY_LENGTH} characters.`);
    else q = rawQ.trim();
  }

  let sortField = DEFAULT_SORT;
  let sortDirection = 'ASC';
  const rawSort = single('sort');
  if (rawSort !== undefined) {
    const desc = typeof rawSort === 'string' && rawSort.startsWith('-');
    const field = desc ? rawSort.slice(1) : rawSort;
    if (SORT_FIELDS.includes(field)) {
      sortField = field;
      sortDirection = desc ? 'DESC' : 'ASC';
    } else {
      errors.push(`"sort" must be one of: ${SORT_FIELDS.flatMap((f) => [f, `-${f}`]).join(', ')}.`);
    }
  }

  let includeArchived = false;
  const rawArchived = single('includeArchived');
  if (rawArchived !== undefined) {
    if (rawArchived === 'true') includeArchived = true;
    else if (rawArchived !== 'false') errors.push('"includeArchived" must be "true" or "false".');
  }

  if (errors.length) {
    throw new ApiError(400, 'Invalid query parameters', errors);
  }
  return { page, limit, q, sortField, sortDirection, includeArchived };
};

module.exports = { parseCourseQuery, DEFAULT_LIMIT, MAX_LIMIT };
