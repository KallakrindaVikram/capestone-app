import React, { useState, useEffect, useContext, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Context from '../../Context';
import Loading from '../Loading';

export const PAGE_SIZE = 9;
export const DEFAULT_SORT = 'id';
export const SORT_OPTIONS = [
  { value: 'id', label: 'Default' },
  { value: 'title', label: 'Title (A-Z)' },
  { value: '-title', label: 'Title (Z-A)' },
  { value: '-createdAt', label: 'Newest first' },
];

const toPage = (value) => (/^\d+$/.test(value || '') && Number(value) >= 1 ? Number(value) : 1);

const Courses = () => {
  const context = useContext(Context.Context);
  const authUser = context.authenticatedUser;
  const [searchParams, setSearchParams] = useSearchParams();

  // The URL is the source of truth for the list state
  const page = toPage(searchParams.get('page'));
  const q = searchParams.get('q') || '';
  const sortParam = searchParams.get('sort');
  const sort = SORT_OPTIONS.some((o) => o.value === sortParam) ? sortParam : DEFAULT_SORT;
  const includeArchived = !!authUser && searchParams.get('archived') === 'true';

  const [keyword, setKeyword] = useState(q);
  const [result, setResult] = useState({ courses: [], pagination: null });
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [reloadCount, setReloadCount] = useState(0);

  const email = authUser ? authUser.emailAddress : null;
  const password = authUser ? authUser.password : null;
  const data = context.data;

  useEffect(() => { setKeyword(q); }, [q]);

  useEffect(() => {
    let isCurrent = true;
    setIsLoading(true);
    setHasError(false);

    const credentials = includeArchived ? { username: email, password } : null;
    data.getCourses({ page, limit: PAGE_SIZE, q, sort, includeArchived }, credentials)
      .then((response) => {
        if (isCurrent) setResult(response);
      })
      .catch((error) => {
        console.error('Error fetching and parsing data', error);
        if (isCurrent) setHasError(true);
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false);
      });

    // Ignore responses from superseded requests
    return () => { isCurrent = false; };
  }, [data, page, q, sort, includeArchived, email, password, reloadCount]);

  const updateParams = useCallback((changes) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(changes).forEach(([key, value]) => {
      if (value === '' || value === null || value === undefined || value === false) next.delete(key);
      else next.set(key, String(value));
    });
    if (next.get('page') === '1') next.delete('page');
    if (next.get('sort') === DEFAULT_SORT) next.delete('sort');
    setSearchParams(next);
  }, [searchParams, setSearchParams]);

  const { courses, pagination } = result;
  const totalPages = pagination ? pagination.totalPages : 0;

  // If the requested page is past the end (e.g. after a search or a stale link), jump to the last one
  useEffect(() => {
    if (!isLoading && !hasError && pagination && totalPages > 0 && page > totalPages) {
      const next = new URLSearchParams(searchParams);
      if (totalPages === 1) next.delete('page'); else next.set('page', String(totalPages));
      setSearchParams(next, { replace: true });
    }
  }, [isLoading, hasError, pagination, totalPages, page, searchParams, setSearchParams]);

  const onSearch = (event) => {
    event.preventDefault();
    updateParams({ q: keyword.trim(), page: 1 });
  };

  const clearSearch = () => {
    setKeyword('');
    updateParams({ q: '', page: 1 });
  };

  const addCourseTile = (
    <Link to='/courses/create' className="course--module course--add--module">
      <span className="course--add--title">
        <svg version="1.1" xmlns="http://www.w3.org/2000/svg" x="0px" y="0px"
          viewBox="0 0 13 13" className="add"><polygon points="7,6 7,0 6,0 6,6 0,6 0,7 6,7 6,13 7,13 7,7 13,7 13,6 "></polygon></svg>
        New Course
      </span>
    </Link>
  );

  const toolbar = (
    <div className="catalog--toolbar">
      <form className="catalog--search" role="search" onSubmit={onSearch}>
        <label htmlFor="courseSearch" className="visually-hidden">Search courses</label>
        <input id="courseSearch" type="search" value={keyword} placeholder="Search courses"
          maxLength={100} onChange={(event) => setKeyword(event.target.value)} />
        <button type="submit" className="button">Search</button>
      </form>
      <div className="catalog--controls">
        <label htmlFor="courseSort">Sort by</label>
        <select id="courseSort" value={sort} onChange={(event) => updateParams({ sort: event.target.value, page: 1 })}>
          {SORT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
        {authUser ?
          <label className="catalog--checkbox" htmlFor="showArchived">
            <input id="showArchived" type="checkbox" checked={includeArchived}
              onChange={(event) => updateParams({ archived: event.target.checked, page: 1 })} />
            Show my archived courses
          </label>
          : null
        }
      </div>
    </div>
  );

  let content;
  if (hasError) {
    content = (
      <div className="validation--errors" role="alert">
        <h3>We couldn't load the courses</h3>
        <p>Something went wrong while contacting the server.</p>
        <button type="button" className="button" onClick={() => setReloadCount((count) => count + 1)}>Try again</button>
      </div>
    );
  } else if (isLoading) {
    content = <Loading />;
  } else if (courses.length === 0) {
    content = (
      <div className="catalog--empty">
        <p>{q ? `No courses match "${q}".` : 'There are no courses yet.'}</p>
        {q ? <button type="button" className="button button-secondary" onClick={clearSearch}>Clear search</button> : null}
        <div className="main--grid">{addCourseTile}</div>
      </div>
    );
  } else {
    content = (
      <>
        <p className="catalog--summary" aria-live="polite">
          {pagination.total} {pagination.total === 1 ? 'course' : 'courses'}{q ? ` matching "${q}"` : ''}
        </p>
        <div className="main--grid">
          {courses.map((course) => (
            <Link to={`/courses/${course.id}`} className="course--module course--link" key={course.id}>
              <h2 className="course--label">
                Course
                {course.archived ? <span className="course--badge">Archived</span> : null}
              </h2>
              <h3 className="course--title">{course.title}</h3>
            </Link>
          ))}
          {addCourseTile}
        </div>
        {totalPages > 1 ?
          <nav className="catalog--pagination" aria-label="Pagination">
            <button type="button" className="button button-secondary" disabled={page <= 1}
              onClick={() => updateParams({ page: page - 1 })}>Previous</button>
            <span>Page {pagination.page} of {totalPages}</span>
            <button type="button" className="button button-secondary" disabled={page >= totalPages}
              onClick={() => updateParams({ page: page + 1 })}>Next</button>
          </nav>
          : null
        }
      </>
    );
  }

  return (
    <div className="wrap">
      {toolbar}
      {content}
    </div>
  );
}

export default Courses;
