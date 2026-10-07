import React from 'react';
import { screen } from '@testing-library/react';
import App from './App';
import { renderWithProviders, alex } from './testUtils';

// react-markdown ships as an ES module, which Jest (CRA) cannot parse
jest.mock('react-markdown', () => ({ children }) => <div>{children}</div>);

test('redirects an unauthenticated visitor from /favorites to the sign-in page', async () => {
  renderWithProviders(<App />, { route: '/favorites' });

  expect(await screen.findByRole('heading', { name: 'Sign In' })).toBeInTheDocument();
  expect(screen.getByTestId('location')).toHaveTextContent('/signin');
});

test('shows the My Favorites page to a signed-in user and links to it from the header', async () => {
  renderWithProviders(<App />, { route: '/favorites', authenticatedUser: alex });

  expect(await screen.findByText("You haven't favorited any courses yet.")).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'My Favorites' })).toHaveAttribute('href', '/favorites');
});

test('does not show the My Favorites link when signed out', async () => {
  renderWithProviders(<App />, { route: '/courses' });

  expect(await screen.findByText('Course 1')).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: 'My Favorites' })).not.toBeInTheDocument();
});
