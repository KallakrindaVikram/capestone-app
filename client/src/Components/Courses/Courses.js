import React, { useState, useEffect, useContext, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Context from '../../Context';
import Loading from '../Loading';
import CatalogToolbar from './CatalogToolbar';
import CourseCard from './CourseCard';
import EmptyState from './EmptyState';
import PaginationControls from './PaginationControls';
import { parseCatalogParams, toQueryString } from './catalogQuery';

const Courses = () => {
  const context = useContext(Context.Context);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState(null);
  const [owners, setOwners] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // The URL query string is the single source of truth for the catalog state
  const { q, ownerId, sort, page, pageSize } = parseCatalogParams(searchParams);

  const updateUrl = useCallback((state, replace = false) => {
    navigate({ search: toQueryString(state) }, { replace });
  }, [navigate]);

  // Replace invalid or non-canonical query strings (e.g. page=abc) with their normalised form
  const rawQuery = searchParams.toString();
  useEffect(() => {
    const canonical = toQueryString({ q, ownerId, sort, page, pageSize });
    if (canonical.replace(/^\?/, '') !== rawQuery) {
      updateUrl({ q, ownerId, sort, page, pageSize }, true);
    }
  }, [q, ownerId, sort, page, pageSize, rawQuery, updateUrl]);

  useEffect(() => {
    context.data.getOwners()
      .then(setOwners)
      .catch((error) => console.error('Error fetching owners', error));
  }, [context.data]);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    context.data.getCourses({ q, ownerId, sort, page, pageSize })
      .then((response) => {
        if (cancelled) return;
        setItems(response.items);
        setMeta(response.meta);
        setIsLoading(false);
        // The API falls back to the last page when the requested page is out of range
        if (response.meta.page !== page) {
          updateUrl({ q, ownerId, sort, page: response.meta.page, pageSize }, true);
        }
      })
      .catch((error) => {
        if (cancelled) return;
        console.error('Error fetching and parsing data', error);
        navigate('/error');
      });
    return () => { cancelled = true; };
  }, [q, ownerId, sort, page, pageSize, navigate, context.data, updateUrl]);

  // Changing the search, owner or sort always returns to the first page
  const change = (changes) => updateUrl({ q, ownerId, sort, pageSize, ...changes, page: 1 });

  const hasCriteria = !!q || !!ownerId;
  const emptyMessage = hasCriteria ? 'No courses match your search.' : 'No courses available yet.';

  return (
    <div className="wrap">
      <CatalogToolbar
        q={q}
        ownerId={ownerId}
        sort={sort}
        owners={owners}
        onSearch={(text) => change({ q: text })}
        onClear={() => change({ q: '' })}
        onOwnerChange={(id) => change({ ownerId: id })}
        onSortChange={(value) => change({ sort: value })}
      />
      {isLoading ?
        <Loading />
        : <>
          {items.length === 0 ? <EmptyState message={emptyMessage} /> : null}
          <div className="main--grid">
            {items.map((course) => <CourseCard course={course} key={course.id} />)}
            <Link to='/courses/create' className="course--module course--add--module">
              <span className="course--add--title">
                <svg version="1.1" xmlns="http://www.w3.org/2000/svg" x="0px" y="0px"
                  viewBox="0 0 13 13" className="add"><polygon points="7,6 7,0 6,0 6,6 0,6 0,7 6,7 6,13 7,13 7,7 13,7 13,6 "></polygon></svg>
                New Course
              </span>
            </Link>
          </div>
          {meta && meta.totalPages > 0 ?
            <PaginationControls
              page={meta.page}
              totalPages={meta.totalPages}
              onPageChange={(nextPage) => updateUrl({ q, ownerId, sort, pageSize, page: nextPage })}
            />
            : null}
        </>
      }
    </div>
  );
}

export default Courses;
