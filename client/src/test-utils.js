import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import Context from './Context';

export const owner = { id: 1, firstName: 'Olive', lastName: 'Owner', emailAddress: 'owner@example.com', password: 'ownerpassword' };

export const makeCourse = (overrides = {}) => ({
  id: 1,
  title: 'Course One',
  description: 'A description',
  estimatedTime: '2 hours',
  materialsNeeded: '* pen',
  archived: false,
  userId: 1,
  User: { id: 1, firstName: 'Olive', lastName: 'Owner', emailAddress: 'owner@example.com' },
  ...overrides,
});

export const makePage = (courses, pagination = {}) => ({
  courses,
  pagination: { page: 1, limit: 9, total: courses.length, totalPages: 1, ...pagination },
});

export const LocationDisplay = () => {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}{location.search}</div>;
};

/**
 * Render routes inside a router and a Context provider with a mocked data layer.
 * Each entry of `routes` is { path, element }; the current location is rendered alongside.
 */
export const renderWithContext = (routes, { route = '/', authUser = null, data = {} } = {}) => {
  const value = { authenticatedUser: authUser, data, actions: { signIn: jest.fn(), signOut: jest.fn() } };
  return render(
    <Context.Context.Provider value={value}>
      <MemoryRouter initialEntries={[route]}>
        <Routes>
          {routes.map(({ path, element }) => <Route key={path} path={path} element={element} />)}
        </Routes>
        <LocationDisplay />
      </MemoryRouter>
    </Context.Context.Provider>
  );
};
