import React, { useState, useEffect } from 'react';
import { SORT_OPTIONS } from './catalogQuery';

const CatalogToolbar = ({ q, ownerId, sort, owners, onSearch, onClear, onOwnerChange, onSortChange }) => {
  const [searchText, setSearchText] = useState(q);

  // Keep the input in step with the URL (back/forward navigation, Clear, normalisation)
  useEffect(() => {
    setSearchText(q);
  }, [q]);

  const submit = (event) => {
    event.preventDefault();
    onSearch(searchText.trim());
  };

  const clear = () => {
    setSearchText('');
    onClear();
  };

  return (
    <div className="catalog--toolbar">
      <form role="search" className="catalog--search" onSubmit={submit}>
        <label htmlFor="catalog-search">Search</label>
        <input
          id="catalog-search"
          name="q"
          type="search"
          placeholder="Search by title or description"
          value={searchText}
          onChange={(event) => setSearchText(event.target.value)}
        />
        <button type="submit" className="button">Search</button>
        <button type="button" className="button button-secondary" onClick={clear}>Clear</button>
      </form>
      <div className="catalog--filters">
        <div>
          <label htmlFor="catalog-owner">Owner</label>
          <select
            id="catalog-owner"
            value={ownerId || ''}
            onChange={(event) => onOwnerChange(event.target.value ? Number(event.target.value) : null)}
          >
            <option value="">All Owners</option>
            {owners.map((owner) => (
              <option key={owner.id} value={owner.id}>{owner.firstName} {owner.lastName}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="catalog-sort">Sort</label>
          <select id="catalog-sort" value={sort} onChange={(event) => onSortChange(event.target.value)}>
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};

export default CatalogToolbar;
