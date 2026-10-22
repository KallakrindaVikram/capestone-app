import React, { useState, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Context from '../../Context';

const FavoriteToggle = ({ courseId, initialFavorited = false }) => {
  const context = useContext(Context.Context);
  const authUser = context.authenticatedUser;
  const navigate = useNavigate();
  const location = useLocation();
  const [favorited, setFavorited] = useState(initialFavorited);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  const toggle = async () => {
    if (!authUser) {
      navigate('/signin', { state: { from: location.pathname + location.search } });
      return;
    }

    const next = !favorited;
    setError('');
    setPending(true);
    setFavorited(next); // optimistic update
    try {
      if (next) {
        await context.data.favoriteCourse(courseId, authUser.emailAddress, authUser.password);
      } else {
        await context.data.unfavoriteCourse(courseId, authUser.emailAddress, authUser.password);
      }
    } catch (err) {
      console.error(err);
      setFavorited(!next); // roll back
      setError('Sorry, we could not update your favorites. Please try again.');
    } finally {
      setPending(false);
    }
  };

  return (
    <>
      <button
        type="button"
        className="button button-secondary favorite--toggle"
        aria-pressed={favorited}
        disabled={pending}
        onClick={toggle}
      >
        {favorited ? '★ Favorited' : '☆ Favorite'}
      </button>
      {error ? <span className="favorite--error" role="alert">{error}</span> : null}
    </>
  );
};

export default FavoriteToggle;
