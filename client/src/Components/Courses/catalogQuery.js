export const DEFAULT_SORT = 'newest';

export const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'title_asc', label: 'Title (A-Z)' },
];

const toPositiveInt = (value) => (/^\d+$/.test(value || '') && Number(value) >= 1 ? Number(value) : null);

/**
 * Reads and coerces the catalog state (q, ownerId, sort, page, pageSize) from the URL query string.
 * Invalid values fall back to their defaults.
 */
export const parseCatalogParams = (searchParams) => {
  const sort = searchParams.get('sort');
  return {
    q: (searchParams.get('q') || '').trim(),
    ownerId: toPositiveInt(searchParams.get('ownerId')),
    sort: SORT_OPTIONS.some(option => option.value === sort) ? sort : DEFAULT_SORT,
    page: toPositiveInt(searchParams.get('page')) || 1,
    pageSize: toPositiveInt(searchParams.get('pageSize')),
  };
};

/** Builds the canonical query string for a catalog state, omitting default values. */
export const toQueryString = ({ q, ownerId, sort, page, pageSize }) => {
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (ownerId) params.set('ownerId', String(ownerId));
  if (sort && sort !== DEFAULT_SORT) params.set('sort', sort);
  if (page && page > 1) params.set('page', String(page));
  if (pageSize) params.set('pageSize', String(pageSize));
  const query = params.toString();
  return query ? `?${query}` : '';
};
