import React, { useState, useEffect } from 'react';

export const SORT_OPTIONS = [
  { value: '', label: 'Default', sort: '', order: '' },
  { value: 'title:asc', label: 'Title (A-Z)', sort: 'title', order: 'asc' },
  { value: 'title:desc', label: 'Title (Z-A)', sort: 'title', order: 'desc' },
  { value: 'updatedAt:desc', label: 'Last Updated (Newest)', sort: 'updatedAt', order: 'desc' },
  { value: 'updatedAt:asc', label: 'Last Updated (Oldest)', sort: 'updatedAt', order: 'asc' },
];

/**
 * Search box, author filter and sort selector for the course catalog.
 * Stateless with respect to the catalog: current values come from props (the URL)
 * and every change is reported through the on* callbacks.
 */
const CatalogControls = ({ q, userId, sort, order, authors, onSearch, onAuthorChange, onSortChange }) => {
  const [keyword, setKeyword] = useState(q);

  // keep the input in step with the URL (back/forward navigation, Clear)
  useEffect(() => setKeyword(q), [q]);

  const sortValue = sort ? `${sort}:${order}` : '';
  const sortKnown = SORT_OPTIONS.some((option) => option.value === sortValue);
  const authorKnown = !userId || authors.some((author) => String(author.id) === userId);

  const submit = (event) => {
    event.preventDefault();
    onSearch(keyword.trim());
  };

  const clear = () => {
    setKeyword('');
    onSearch('');
  };

  const changeSort = (event) => {
    const option = SORT_OPTIONS.find((item) => item.value === event.target.value);
    onSortChange(option.sort, option.order);
  };

  return (
    <div className="catalog--controls">
      <form className="catalog--search" role="search" onSubmit={submit}>
        <label htmlFor="catalogSearch">Search courses</label>
        <div className="catalog--search--row">
          <input
            id="catalogSearch"
            name="q"
            type="search"
            maxLength={100}
            placeholder="Search by title or description"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
          />
          <button className="button" type="submit">Search</button>
          <button className="button button-secondary" type="button" onClick={clear}>Clear</button>
        </div>
      </form>
      <div className="catalog--filters">
        <div>
          <label htmlFor="catalogAuthor">Author</label>
          <select id="catalogAuthor" name="userId" value={userId} onChange={(event) => onAuthorChange(event.target.value)}>
            <option value="">All</option>
            {authors.map((author) => (
              <option key={author.id} value={String(author.id)}>{author.firstName} {author.lastName}</option>
            ))}
            {!authorKnown && <option value={userId}>Unknown author ({userId})</option>}
          </select>
        </div>
        <div>
          <label htmlFor="catalogSort">Sort by</label>
          <select id="catalogSort" name="sort" value={sortKnown ? sortValue : ''} onChange={changeSort}>
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};

export default CatalogControls;
