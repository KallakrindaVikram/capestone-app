import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import Context from './Context';

export const alex = { id: 1, firstName: 'Alex', lastName: 'Ames', emailAddress: 'alex@test.com', password: 'alexpassword' };

export const makeCourse = (id, overrides = {}) => ({
  id,
  title: `Course ${id}`,
  description: `Description ${id}`,
  User: { id: 2, firstName: 'Bella', lastName: 'Bell', emailAddress: 'bella@test.com' },
  ...overrides,
});

export const makeMeta = (overrides = {}) => ({
  totalCount: 2, page: 1, pageSize: 12, totalPages: 1, sortApplied: 'newest', qApplied: null, ownerIdApplied: null,
  ...overrides,
});

/** A fake Data object where every API method is a jest mock. */
export const makeData = (overrides = {}) => ({
  getCourses: jest.fn().mockResolvedValue({ items: [makeCourse(1), makeCourse(2)], meta: makeMeta() }),
  getOwners: jest.fn().mockResolvedValue([
    { id: 1, firstName: 'Alex', lastName: 'Ames' },
    { id: 2, firstName: 'Bella', lastName: 'Bell' },
  ]),
  getCourse: jest.fn(),
  getFavorites: jest.fn().mockResolvedValue([]),
  favoriteCourse: jest.fn().mockResolvedValue(undefined),
  unfavoriteCourse: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

// Shows the current URL so tests can assert on the query string
export const LocationDisplay = () => {
  const location = useLocation();
  return <div data-testid="location">{location.pathname + location.search}</div>;
};

export const renderWithProviders = (ui, { route = '/', data = makeData(), authenticatedUser = null } = {}) => {
  const value = { authenticatedUser, data, actions: { signIn: jest.fn(), signOut: jest.fn() } };
  return {
    data,
    ...render(
      <Context.Context.Provider value={value}>
        <MemoryRouter initialEntries={[route]}>
          {ui}
          <LocationDisplay />
        </MemoryRouter>
      </Context.Context.Provider>
    ),
  };
};
