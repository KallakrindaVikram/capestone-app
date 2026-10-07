'use strict';

const { Op, fn, col, where: sqlWhere } = require('sequelize');

const MAX_QUERY_LENGTH = 100;
const SORT_FIELDS = ['title', 'updatedAt'];
const ORDERS = ['asc', 'desc'];
const DEFAULT_ORDER = { title: 'asc', updatedAt: 'desc' };

/**
 * Validates GET /api/courses query params and translates them into Sequelize options.
 * @param {Object} query - req.query
 * @returns {{errors: string[]}|{where: Object, order: Array}}
 */
function buildCourseQuery(query = {}) {
  const errors = [];
  const conditions = [];

  const isString = (value) => typeof value === 'string';

  let q = query.q;
  if (q !== undefined) {
    if (!isString(q)) {
      errors.push('Invalid q value. Provide a single search keyword.');
    } else {
      q = q.trim();
      if (q.length > MAX_QUERY_LENGTH) {
        errors.push(`Invalid q value. Maximum length is ${MAX_QUERY_LENGTH} characters.`);
      } else if (q.length > 0) {
        // instr() treats the keyword literally, so '%' and '_' are not LIKE wildcards
        const needle = q.toLowerCase();
        conditions.push({
          [Op.or]: [
            sqlWhere(fn('instr', fn('lower', col('Course.title')), needle), { [Op.gt]: 0 }),
            sqlWhere(fn('instr', fn('lower', col('Course.description')), needle), { [Op.gt]: 0 }),
          ],
        });
      }
    }
  }

  const userId = query.userId;
  if (userId !== undefined) {
    if (!isString(userId) || !/^[1-9]\d{0,14}$/.test(userId)) {
      errors.push('Invalid userId value. Must be a positive integer.');
    } else {
      conditions.push({ userId: Number(userId) });
    }
  }

  const { sort, order } = query;
  if (sort !== undefined && !SORT_FIELDS.includes(sort)) {
    errors.push(`Invalid sort value. Allowed: ${SORT_FIELDS.join(', ')}`);
  }
  if (order !== undefined && !ORDERS.includes(order)) {
    errors.push(`Invalid order value. Allowed: ${ORDERS.join(', ')}`);
  }

  if (errors.length) {
    return { errors };
  }

  // sort without order uses a per-field default; order without sort applies to id
  const sortField = sort === undefined ? 'id' : sort;
  const direction = order || DEFAULT_ORDER[sortField] || 'asc';
  const dir = direction.toUpperCase();
  // SQLite's default collation is case-sensitive; sort titles case-insensitively
  const orderBy = [[sortField === 'title' ? fn('lower', col('Course.title')) : sortField, dir]];
  if (sortField !== 'id') {
    orderBy.push(['id', 'ASC']); // stable tie-breaker
  }

  return {
    where: conditions.length ? { [Op.and]: conditions } : {},
    order: orderBy,
  };
}

module.exports = { buildCourseQuery, MAX_QUERY_LENGTH, SORT_FIELDS, ORDERS };
