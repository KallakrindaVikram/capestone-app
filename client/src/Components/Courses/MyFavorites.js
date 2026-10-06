import React, { useState, useEffect, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Context from '../../Context';
import Loading from '../Loading';

const MyFavorites = () => {
  const context = useContext(Context.Context);
  const authUser = context.authenticatedUser;
  const [favorites, setFavorites] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    context.data.getMyFavorites(authUser.emailAddress, authUser.password)
      .then((response) => {
        if (!cancelled) setFavorites(response);
      })
      .catch((error) => {
        if (cancelled) return;
        console.error('Error fetching favorites', error);
        navigate(error.status === 401 ? '/signin' : '/error');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => { cancelled = true; };
  }, [authUser.emailAddress, authUser.password, context.data, navigate]);

  return (
    isLoading ?
      <Loading />
      : <div className="wrap">
        <h2>My Favorites</h2>
        {favorites.length ?
          <ul className="favorites--list">
            {favorites.map((course) => (
              <li key={course.id}>
                <Link to={`/courses/${course.id}`} className="course--module course--link">
                  <h3 className="course--title">{course.title}</h3>
                  {course.User ? <p className="course--author">by {course.User.firstName} {course.User.lastName}</p> : null}
                </Link>
              </li>
            ))}
          </ul>
          : <p className="catalog--empty">You haven't favorited any courses yet. <Link to="/courses">Browse courses</Link></p>
        }
      </div>
  );
}

export default MyFavorites;
