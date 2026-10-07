import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FavoriteToggle from '../Components/Courses/FavoriteToggle';
import CourseDetail from '../Components/Courses/CourseDetail';
import MyFavorites from '../Components/Courses/MyFavorites';
import { renderWithProviders, makeData, makeCourse, alex } from '../testUtils';

// react-markdown ships as an ES module, which Jest (CRA) cannot parse
jest.mock('react-markdown', () => ({ children }) => <div>{children}</div>);

const location = () => screen.getByTestId('location').textContent;

describe('FavoriteToggle', () => {
  test('redirects an unauthenticated user to sign in without calling the API', async () => {
    const { data } = renderWithProviders(
      <Routes>
        <Route path="/courses/:id" element={<FavoriteToggle courseId={5} />} />
        <Route path="/signin" element={<p>Sign in page</p>} />
      </Routes>,
      { route: '/courses/5' }
    );

    userEvent.click(screen.getByRole('button', { name: /favorite/i }));

    expect(await screen.findByText('Sign in page')).toBeInTheDocument();
    expect(data.favoriteCourse).not.toHaveBeenCalled();
  });

  test('shows the current state and favorites optimistically', async () => {
    let resolve;
    const data = makeData({ favoriteCourse: jest.fn(() => new Promise((r) => { resolve = r; })) });
    renderWithProviders(<FavoriteToggle courseId={5} initialFavorited={false} />, { data, authenticatedUser: alex });

    const button = screen.getByRole('button', { name: /favorite/i });
    expect(button).toHaveAttribute('aria-pressed', 'false');

    userEvent.click(button);

    // Updated before the request completes
    expect(button).toHaveAttribute('aria-pressed', 'true');
    expect(button).toHaveTextContent('Favorited');
    expect(data.favoriteCourse).toHaveBeenCalledWith(5, alex.emailAddress, alex.password);

    resolve();
    await waitFor(() => expect(button).toBeEnabled());
    expect(button).toHaveAttribute('aria-pressed', 'true');
  });

  test('unfavorites a favorited course', async () => {
    const { data } = renderWithProviders(<FavoriteToggle courseId={5} initialFavorited />, { authenticatedUser: alex });

    const button = screen.getByRole('button', { name: /favorited/i });
    expect(button).toHaveAttribute('aria-pressed', 'true');
    userEvent.click(button);

    await waitFor(() => expect(button).toHaveAttribute('aria-pressed', 'false'));
    expect(data.unfavoriteCourse).toHaveBeenCalledWith(5, alex.emailAddress, alex.password);
  });

  test('rolls back and shows an error when the request fails', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => { });
    const data = makeData({ favoriteCourse: jest.fn().mockRejectedValue(new Error('boom')) });
    renderWithProviders(<FavoriteToggle courseId={5} />, { data, authenticatedUser: alex });

    const button = screen.getByRole('button', { name: /favorite/i });
    userEvent.click(button);

    expect(await screen.findByRole('alert')).toHaveTextContent(/could not update your favorites/i);
    expect(button).toHaveAttribute('aria-pressed', 'false');
    expect(button).toBeEnabled();
    console.error.mockRestore();
  });
});

describe('CourseDetail favorite state', () => {
  const renderDetail = (data, authenticatedUser) => renderWithProviders(
    <Routes><Route path="/courses/:id" element={<CourseDetail />} /></Routes>,
    { route: '/courses/7', data, authenticatedUser }
  );

  test('requests the course with credentials and shows it as favorited', async () => {
    const data = makeData({ getCourse: jest.fn().mockResolvedValue(makeCourse(7, { isFavorited: true })) });
    renderDetail(data, alex);

    const button = await screen.findByRole('button', { name: /favorited/i });
    expect(button).toHaveAttribute('aria-pressed', 'true');
    expect(data.getCourse).toHaveBeenCalledWith('7', alex.emailAddress, alex.password);
  });

  test('offers the favorite toggle to anonymous visitors', async () => {
    const data = makeData({ getCourse: jest.fn().mockResolvedValue(makeCourse(7)) });
    renderDetail(data, null);

    expect(await screen.findByRole('button', { name: /favorite/i })).toHaveAttribute('aria-pressed', 'false');
    expect(data.getCourse).toHaveBeenCalledWith('7', undefined, undefined);
  });

  test('goes to the Not Found page for an unknown course', async () => {
    const data = makeData({ getCourse: jest.fn().mockResolvedValue(null) });
    renderWithProviders(
      <Routes>
        <Route path="/courses/:id" element={<CourseDetail />} />
        <Route path="/notfound" element={<p>Not found page</p>} />
      </Routes>,
      { route: '/courses/999', data }
    );

    expect(await screen.findByText('Not found page')).toBeInTheDocument();
    expect(location()).toBe('/notfound');
  });
});

describe('MyFavorites', () => {
  test('lists only the favorited courses returned for the signed-in user', async () => {
    const data = makeData({ getFavorites: jest.fn().mockResolvedValue([makeCourse(3), makeCourse(9)]) });
    renderWithProviders(<MyFavorites />, { route: '/favorites', data, authenticatedUser: alex });

    expect(await screen.findByText('Course 3')).toBeInTheDocument();
    expect(screen.getByText('Course 9')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'My Favorites' })).toBeInTheDocument();
    expect(data.getFavorites).toHaveBeenCalledWith(alex.emailAddress, alex.password);
  });

  test('shows an empty state when there are no favorites', async () => {
    renderWithProviders(<MyFavorites />, { route: '/favorites', authenticatedUser: alex });

    expect(await screen.findByText("You haven't favorited any courses yet.")).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Browse Courses' })).toBeInTheDocument();
  });
});
