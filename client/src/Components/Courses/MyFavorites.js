import React, { useState, useEffect, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Context from '../../Context';
import Loading from '../Loading';
import CourseCard from './CourseCard';
import EmptyState from './EmptyState';

const MyFavorites = () => {
  const context = useContext(Context.Context);
  const authUser = context.authenticatedUser;
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    context.data.getFavorites(authUser.emailAddress, authUser.password)
      .then((items) => {
        if (!cancelled) {
          setCourses(items);
          setIsLoading(false);
        }
      })
      .catch((error) => {
        if (cancelled) return;
        console.error('Error fetching favorites', error);
        navigate('/error');
      });
    return () => { cancelled = true; };
  }, [navigate, context.data, authUser.emailAddress, authUser.password]);

  if (isLoading) {
    return <Loading />;
  }

  return (
    <div className="wrap">
      <h2>My Favorites</h2>
      {courses.length === 0 ?
        <>
          <EmptyState message="You haven't favorited any courses yet." />
          <Link to="/courses" className="button">Browse Courses</Link>
        </>
        : <div className="main--grid">
          {courses.map((course) => <CourseCard course={course} key={course.id} />)}
        </div>
      }
    </div>
  );
}

export default MyFavorites;
