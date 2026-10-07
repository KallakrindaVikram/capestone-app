import React, { useState, useEffect, useContext, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Context from '../../Context';
import Loading from '../Loading';
import CatalogControls from './CatalogControls';
import EmptyState from './EmptyState';

const formatDate = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};

const Courses = () => {
  const context = useContext(Context.Context);
  const [searchParams, setSearchParams] = useSearchParams();
  const [courses, setCourses] = useState([]);
  const [authors, setAuthors] = useState([]);
  const [errors, setErrors] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  let navigate = useNavigate();

  const q = searchParams.get('q') || '';
  const userId = searchParams.get('userId') || '';
  const sort = searchParams.get('sort') || '';
  const order = searchParams.get('order') || '';

  // Author options come from the unfiltered catalog so they stay stable while filtering
  useEffect(() => {
    let cancelled = false;
    context.data.getCourses()
      .then((all) => {
        if (cancelled) return;
        const byId = new Map();
        all.forEach((course) => {
          if (course.User && !byId.has(course.User.id)) {
            byId.set(course.User.id, course.User);
          }
        });
        setAuthors([...byId.values()].sort((a, b) =>
          `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`)));
      })
      .catch((error) => console.error('Error fetching authors', error));
    return () => { cancelled = true; };
  }, [context.data]);

  useEffect(() => {
    let cancelled = false; // ignore out-of-order responses
    setIsLoading(true);
    context.data.getCourses({ q, userId, sort, order })
      .then((response) => {
        if (cancelled) return;
        setCourses(response);
        setErrors([]);
      })
      .catch((error) => {
        if (cancelled) return;
        if (error.status === 400) {
          setCourses([]);
          setErrors(error.errors);
        } else {
          console.error('Error fetching and parsing data', error);
          navigate('/error');
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => { cancelled = true; };
  }, [navigate, context.data, q, userId, sort, order]);

  // Merge changes into the current query string; empty values are removed from the URL
  const updateParams = (changes) => {
    const next = { q, userId, sort, order, ...changes };
    const params = {};
    Object.keys(next).forEach((key) => {
      if (next[key]) params[key] = next[key];
    });
    setSearchParams(params);
  };

  const courseLinks = useMemo(() => courses.map((course) => {
    const updated = course.updatedAt ? formatDate(course.updatedAt) : null;
    return (
      <Link to={`/courses/${course.id}`} className="course--module course--link" key={course.id}>
        <h2 className="course--label">Course</h2>
        <h3 className="course--title">{course.title}</h3>
        {updated && <p className="course--updated">Updated {updated}</p>}
      </Link>
    );
  }), [courses]);

  return (
    <div className="wrap">
      <CatalogControls
        q={q}
        userId={userId}
        sort={sort}
        order={order}
        authors={authors}
        onSearch={(keyword) => updateParams({ q: keyword })}
        onAuthorChange={(id) => updateParams({ userId: id })}
        onSortChange={(newSort, newOrder) => updateParams({ sort: newSort, order: newOrder })}
      />
      {errors.length ?
        <div className="validation--errors">
          <h3>Validation Errors</h3>
          <ul>
            {errors.map((error, i) => <li key={i}>{error}</li>)}
          </ul>
        </div>
        : null
      }
      {isLoading ?
        <Loading />
        : <>
          {!errors.length && courses.length === 0 && <EmptyState />}
          <div className="main--grid">
            {courseLinks}
            <Link to='/courses/create' className="course--module course--add--module">
              <span className="course--add--title">
                <svg version="1.1" xmlns="http://www.w3.org/2000/svg" x="0px" y="0px"
                  viewBox="0 0 13 13" className="add"><polygon points="7,6 7,0 6,0 6,6 0,6 0,7 6,7 6,13 7,13 7,7 13,7 13,6 "></polygon></svg>
                New Course
              </span>
            </Link>
          </div>
        </>
      }
    </div>
  );
}

export default Courses;
