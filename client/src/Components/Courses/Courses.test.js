import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import Context from '../../Context';
import Courses from './Courses';

const joe = { id: 1, firstName: 'Joe', lastName: 'Smith', emailAddress: 'joe@smith.com' };
const sally = { id: 2, firstName: 'Sally', lastName: 'Jones', emailAddress: 'sally@jones.com' };

const COURSES = [
  { id: 1, title: 'Build a Basic Bookcase', description: 'Woodworking with pine.', updatedAt: '2026-06-15T09:00:00.000Z', User: joe },
  { id: 2, title: 'React Fundamentals', description: 'Components, props and hooks.', updatedAt: '2026-09-25T08:00:00.000Z', User: joe },
  { id: 3, title: 'Node.js REST APIs', description: 'Build an API with Express.', updatedAt: '2026-05-02T10:20:00.000Z', User: sally },
  { id: 4, title: 'Advanced React Patterns', description: 'Custom hooks for large apps.', updatedAt: '2026-04-18T17:00:00.000Z', User: sally },
];

// Mirrors the documented GET /api/courses behaviour closely enough to drive the UI
const queryCourses = ({ q, userId, sort, order } = {}) => {
  let result = [...COURSES];
  if (q) {
    const needle = q.toLowerCase();
    result = result.filter((c) => c.title.toLowerCase().includes(needle) || c.description.toLowerCase().includes(needle));
  }
  if (userId) result = result.filter((c) => String(c.User.id) === String(userId));
  if (sort === 'title') result.sort((a, b) => a.title.localeCompare(b.title));
  if (sort === 'updatedAt') result.sort((a, b) => a.updatedAt.localeCompare(b.updatedAt));
  if (order === 'desc') result.reverse();
  return result;
};

const LocationDisplay = () => <div data-testid="location">{useLocation().search}</div>;

const renderCatalog = ({ url = '/courses', getCourses } = {}) => {
  const data = { getCourses: getCourses || jest.fn((params) => Promise.resolve(queryCourses(params))) };
  render(
    <Context.Context.Provider value={{ data, authenticatedUser: null, actions: {} }}>
      <MemoryRouter initialEntries={[url]}>
        <Routes>
          <Route path="/courses" element={<Courses />} />
          <Route path="/error" element={<div>Error page</div>} />
        </Routes>
        <LocationDisplay />
      </MemoryRouter>
    </Context.Context.Provider>
  );
  return data;
};

const courseTitles = () => screen.queryAllByRole('heading', { level: 3 }).map((h) => h.textContent);
const waitForCatalog = () => screen.findByText('Build a Basic Bookcase').catch(() => screen.findByRole('status'));
const search = () => screen.getByLabelText('Search courses');
const location = () => screen.getByTestId('location').textContent;

describe('Courses catalog', () => {
  test('shows every course and an author option per distinct author', async () => {
    renderCatalog();
    await screen.findByText('React Fundamentals');
    expect(courseTitles()).toHaveLength(4);
    const options = within(screen.getByLabelText('Author')).getAllByRole('option').map((o) => o.textContent);
    expect(options).toEqual(['All', 'Joe Smith', 'Sally Jones']);
  });

  test('shows the last updated date on each tile', async () => {
    renderCatalog();
    await screen.findByText('React Fundamentals');
    expect(screen.getAllByText(/^Updated /)).toHaveLength(4);
  });

  test('search submit filters results and writes q to the URL', async () => {
    const data = renderCatalog();
    await waitForCatalog();
    userEvent.type(search(), 'react');
    userEvent.click(screen.getByRole('button', { name: 'Search' }));

    await waitFor(() => expect(courseTitles()).toEqual(['React Fundamentals', 'Advanced React Patterns']));
    expect(location()).toBe('?q=react');
    expect(data.getCourses).toHaveBeenLastCalledWith({ q: 'react', userId: '', sort: '', order: '' });
  });

  test('pressing Enter submits the search and the keyword is trimmed', async () => {
    renderCatalog();
    await waitForCatalog();
    userEvent.type(search(), '  node  {enter}');
    await waitFor(() => expect(courseTitles()).toEqual(['Node.js REST APIs']));
    expect(location()).toBe('?q=node');
  });

  test('Clear and an empty submit both restore the full list and drop q', async () => {
    renderCatalog({ url: '/courses?q=react' });
    await waitFor(() => expect(courseTitles()).toHaveLength(2));
    expect(search()).toHaveValue('react');

    userEvent.click(screen.getByRole('button', { name: 'Clear' }));
    await waitFor(() => expect(courseTitles()).toHaveLength(4));
    expect(location()).toBe('');
    expect(search()).toHaveValue('');

    userEvent.type(search(), 'sql{enter}');
    await waitFor(() => expect(location()).toBe('?q=sql'));
    userEvent.clear(search());
    userEvent.type(search(), '{enter}');
    await waitFor(() => expect(courseTitles()).toHaveLength(4));
    expect(location()).toBe('');
  });

  test('no matches shows the empty state and no course tiles', async () => {
    renderCatalog();
    await waitForCatalog();
    userEvent.type(search(), 'zzz{enter}');

    expect(await screen.findByText(/No courses match your search/)).toBeInTheDocument();
    expect(courseTitles()).toEqual([]);
    expect(document.querySelectorAll('.course--link')).toHaveLength(0);
  });

  test('author filter writes userId to the URL and All resets it', async () => {
    renderCatalog();
    await waitForCatalog();
    userEvent.selectOptions(screen.getByLabelText('Author'), 'Sally Jones');

    await waitFor(() => expect(courseTitles()).toEqual(['Node.js REST APIs', 'Advanced React Patterns']));
    expect(location()).toBe('?userId=2');
    expect(screen.getByLabelText('Author')).toHaveValue('2');
    // author options stay available while filtered
    expect(within(screen.getByLabelText('Author')).getAllByRole('option')).toHaveLength(3);

    userEvent.selectOptions(screen.getByLabelText('Author'), 'All');
    await waitFor(() => expect(courseTitles()).toHaveLength(4));
    expect(location()).toBe('');
  });

  test('a userId with no courses shows the empty state', async () => {
    renderCatalog({ url: '/courses?userId=999' });
    expect(await screen.findByText(/No courses match your search/)).toBeInTheDocument();
    expect(screen.getByLabelText('Author')).toHaveValue('999');
  });

  test('sorting by title (A-Z) orders results and writes sort/order to the URL', async () => {
    renderCatalog();
    await waitForCatalog();
    userEvent.selectOptions(screen.getByLabelText('Sort by'), 'Title (A-Z)');

    await waitFor(() => expect(courseTitles()).toEqual([
      'Advanced React Patterns', 'Build a Basic Bookcase', 'Node.js REST APIs', 'React Fundamentals',
    ]));
    expect(location()).toBe('?sort=title&order=asc');
  });

  test('sorting by Last Updated (Newest) puts the most recent course first', async () => {
    renderCatalog();
    await waitForCatalog();
    userEvent.selectOptions(screen.getByLabelText('Sort by'), 'Last Updated (Newest)');

    await waitFor(() => expect(courseTitles()).toEqual([
      'React Fundamentals', 'Build a Basic Bookcase', 'Node.js REST APIs', 'Advanced React Patterns',
    ]));
    expect(location()).toBe('?sort=updatedAt&order=desc');
  });

  test('controls combine and are restored from the URL on load', async () => {
    const data = renderCatalog({ url: '/courses?q=react&userId=2&sort=title&order=asc' });
    await waitFor(() => expect(courseTitles()).toEqual(['Advanced React Patterns']));

    expect(data.getCourses).toHaveBeenCalledWith({ q: 'react', userId: '2', sort: 'title', order: 'asc' });
    expect(search()).toHaveValue('react');
    expect(screen.getByLabelText('Author')).toHaveValue('2');
    expect(screen.getByLabelText('Sort by')).toHaveValue('title:asc');
  });

  test('changing one control keeps the others in the URL', async () => {
    renderCatalog({ url: '/courses?userId=1&sort=title&order=asc' });
    await waitForCatalog();
    userEvent.type(search(), 'react{enter}');
    await waitFor(() => expect(new URLSearchParams(location()).get('q')).toBe('react'));
    expect(Object.fromEntries(new URLSearchParams(location()))).toEqual({ q: 'react', userId: '1', sort: 'title', order: 'asc' });
  });

  test('a 400 from the API is shown as validation errors, not the error page', async () => {
    const error = Object.assign(new Error('bad'), { status: 400, errors: ['Invalid sort value. Allowed: title, updatedAt'] });
    const getCourses = jest.fn((params) => (params && params.sort ? Promise.reject(error) : Promise.resolve(COURSES)));
    renderCatalog({ url: '/courses?sort=bogus', getCourses });

    expect(await screen.findByText('Invalid sort value. Allowed: title, updatedAt')).toBeInTheDocument();
    expect(screen.queryByText(/No courses match your search/)).not.toBeInTheDocument();
    expect(screen.queryByText('Error page')).not.toBeInTheDocument();
  });

  test('other API failures navigate to the error page', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    renderCatalog({ getCourses: jest.fn(() => Promise.reject(new Error())) });
    expect(await screen.findByText('Error page')).toBeInTheDocument();
    console.error.mockRestore();
  });
});
