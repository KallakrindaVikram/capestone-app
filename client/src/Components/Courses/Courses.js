import React, { useState, useEffect, useContext } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Context from '../../Context';
import Loading from '../Loading';

const SORT_OPTIONS = [
  { value: '', label: 'Default' },
  { value: 'title_asc', label: 'Title (A-Z)' },
  { value: 'title_desc', label: 'Title (Z-A)' },
  { value: 'created_desc', label: 'Newest' },
];
const PAGE_SIZE_OPTIONS = [10, 20, 50];
const DEFAULT_PAGE_SIZE = 10;

// The URL query string is the single source of truth; invalid values fall back to defaults
const readParams = (searchParams) => {
  const sort = searchParams.get('sort') || '';
  const page = parseInt(searchParams.get('page'), 10);
  const pageSize = parseInt(searchParams.get('pageSize'), 10);
  return {
    q: (searchParams.get('q') || '').trim(),
    sort: SORT_OPTIONS.some((option) => option.value === sort) ? sort : '',
    page: page >= 1 ? page : 1,
    pageSize: PAGE_SIZE_OPTIONS.includes(pageSize) ? pageSize : DEFAULT_PAGE_SIZE,
  };
};

const Courses = () => {
  const context = useContext(Context.Context);
  const [searchParams, setSearchParams] = useSearchParams();
  const { q, sort, page, pageSize } = readParams(searchParams);

  const [searchText, setSearchText] = useState(q);
  const [courses, setCourses] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const navigate = useNavigate();

  const updateParams = (changes, options) => {
    const next = { q, sort, page, pageSize, ...changes };
    const params = {};
    if (next.q) params.q = next.q;
    if (next.sort) params.sort = next.sort;
    params.page = String(next.page);
    params.pageSize = String(next.pageSize);
    setSearchParams(params, options);
  };

  // Keep the input in step with the URL (e.g. browser back/forward)
  useEffect(() => {
    setSearchText(q);
  }, [q]);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    context.data.listCourses({ q, sort, page, pageSize })
      .then(({ data, totalCount }) => {
        if (cancelled) return;
        const lastPage = Math.max(1, Math.ceil(totalCount / pageSize));
        if (page > lastPage) {
          // Requested page is past the end (e.g. stale link); jump to the last page without adding history
          const params = { page: String(lastPage), pageSize: String(pageSize) };
          if (q) params.q = q;
          if (sort) params.sort = sort;
          setSearchParams(params, { replace: true });
          return;
        }
        setCourses(data);
        setTotalCount(totalCount);
        setIsLoading(false);
      })
      .catch((error) => {
        if (cancelled) return;
        console.error('Error fetching and parsing data', error);
        navigate('/error');
      });
    return () => { cancelled = true; };
  }, [q, sort, page, pageSize, context.data, navigate, setSearchParams]);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const firstShown = (page - 1) * pageSize + 1;
  const lastShown = firstShown + courses.length - 1;

  const handleSearch = (event) => {
    event.preventDefault();
    updateParams({ q: searchText.trim(), page: 1 });
  };

  const handleSortChange = (event) => {
    updateParams({ sort: event.target.value, page: 1 });
  };

  const handlePageSizeChange = (event) => {
    updateParams({ pageSize: parseInt(event.target.value, 10), page: 1 });
  };

  const goToPage = (newPage) => {
    updateParams({ page: newPage });
  };

  return (
    <div className="wrap">
      <div className="catalog--toolbar">
        <form className="catalog--search" role="search" onSubmit={handleSearch}>
          <label htmlFor="search">Search</label>
          <input
            id="search"
            name="q"
            type="search"
            value={searchText}
            placeholder="Search by title or description"
            onChange={(event) => setSearchText(event.target.value)}
          />
          <button className="button" type="submit">Search</button>
        </form>
        <div className="catalog--controls">
          <label htmlFor="sort">Sort</label>
          <select id="sort" value={sort} onChange={handleSortChange}>
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <label htmlFor="pageSize">Page size</label>
          <select id="pageSize" value={pageSize} onChange={handlePageSizeChange}>
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>{size}</option>
            ))}
          </select>
        </div>
      </div>

      {isLoading ?
        <Loading />
        : <>
          {courses.length ?
            <p className="catalog--summary">Showing {firstShown}-{lastShown} of {totalCount}</p>
            : <p className="catalog--empty">
              {q ? 'No courses match your search. Try a different keyword.' : 'No courses are available yet.'}
            </p>
          }
          <div className="main--grid">
            {courses.map((course) => (
              <Link to={`/courses/${course.id}`} className="course--module course--link" key={course.id}>
                <h2 className="course--label">Course</h2>
                <h3 className="course--title">{course.title}</h3>
                {course.User ? <p className="course--author">by {course.User.firstName}</p> : null}
              </Link>
            ))}
            <Link to='/courses/create' className="course--module course--add--module">
              <span className="course--add--title">
                <svg version="1.1" xmlns="http://www.w3.org/2000/svg" x="0px" y="0px"
                  viewBox="0 0 13 13" className="add"><polygon points="7,6 7,0 6,0 6,6 0,6 0,7 6,7 6,13 7,13 7,7 13,7 13,6 "></polygon></svg>
                New Course
              </span>
            </Link>
          </div>
          {totalCount > 0 ?
            <nav className="catalog--pagination" aria-label="Pagination">
              <button className="button button-secondary" disabled={page <= 1} onClick={() => goToPage(page - 1)}>&lt; Prev</button>
              <span>Page {page} of {totalPages}</span>
              <button className="button button-secondary" disabled={page >= totalPages} onClick={() => goToPage(page + 1)}>Next &gt;</button>
            </nav>
            : null
          }
        </>
      }
    </div>
  );
}

export default Courses;
