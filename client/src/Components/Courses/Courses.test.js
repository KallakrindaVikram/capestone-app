import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import Context from '../../Context';
import Courses from './Courses';

const course = (id, title) => ({ id, title, User: { id: 1, firstName: 'Joe', lastName: 'Smith' } });

const LocationDisplay = () => <div data-testid="search">{useLocation().search}</div>;

const renderCourses = (listCourses, url = '/courses') => render(
  <Context.Context.Provider value={{ authenticatedUser: null, data: { listCourses } }}>
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/courses" element={<><Courses /><LocationDisplay /></>} />
        <Route path="/error" element={<div>error page</div>} />
      </Routes>
    </MemoryRouter>
  </Context.Context.Provider>
);

test('shows loading, then courses and the result summary', async () => {
  const listCourses = jest.fn().mockResolvedValue({ data: [course(1, 'Alpha'), course(2, 'Beta')], totalCount: 2 });
  renderCourses(listCourses);

  expect(screen.getByText(/loading/i)).toBeInTheDocument();
  expect(await screen.findByText('Alpha')).toBeInTheDocument();
  expect(screen.getByText('Beta')).toBeInTheDocument();
  expect(screen.getByText('Showing 1-2 of 2')).toBeInTheDocument();
  expect(listCourses).toHaveBeenCalledWith({ q: '', sort: '', page: 1, pageSize: 10 });
});

test('reads q, sort, page and pageSize from the URL and shows the empty state', async () => {
  const listCourses = jest.fn().mockResolvedValue({ data: [], totalCount: 0 });
  renderCourses(listCourses, '/courses?q=zzz&sort=title_asc&page=1&pageSize=20');

  expect(await screen.findByText('No courses match your search. Try a different keyword.')).toBeInTheDocument();
  expect(listCourses).toHaveBeenCalledWith({ q: 'zzz', sort: 'title_asc', page: 1, pageSize: 20 });
  expect(screen.getByLabelText('Search')).toHaveValue('zzz');
  expect(screen.getByLabelText('Sort')).toHaveValue('title_asc');
});

test('submitting a search resets to page 1 and writes the query string', async () => {
  const listCourses = jest.fn().mockResolvedValue({ data: [course(1, 'Alpha')], totalCount: 25 });
  renderCourses(listCourses, '/courses?page=2');
  await screen.findByText('Alpha');

  userEvent.type(screen.getByLabelText('Search'), '  react  ');
  userEvent.click(screen.getByRole('button', { name: 'Search' }));

  await waitFor(() => expect(listCourses).toHaveBeenLastCalledWith({ q: 'react', sort: '', page: 1, pageSize: 10 }));
  expect(screen.getByTestId('search')).toHaveTextContent('?q=react&page=1&pageSize=10');
});

test('changing sort resets to page 1; pagination moves between pages', async () => {
  const listCourses = jest.fn().mockResolvedValue({ data: [course(1, 'Alpha')], totalCount: 25 });
  renderCourses(listCourses);
  await screen.findByText('Showing 1-1 of 25');
  expect(screen.getByText('Page 1 of 3')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /prev/i })).toBeDisabled();

  userEvent.click(screen.getByRole('button', { name: /next/i }));
  await waitFor(() => expect(listCourses).toHaveBeenLastCalledWith({ q: '', sort: '', page: 2, pageSize: 10 }));
  await screen.findByText('Page 2 of 3');

  userEvent.selectOptions(screen.getByLabelText('Sort'), 'created_desc');
  await waitFor(() => expect(listCourses).toHaveBeenLastCalledWith({ q: '', sort: 'created_desc', page: 1, pageSize: 10 }));
  expect(screen.getByTestId('search')).toHaveTextContent('?sort=created_desc&page=1&pageSize=10');
});

test('a page past the end is replaced with the last page', async () => {
  const listCourses = jest.fn()
    .mockResolvedValueOnce({ data: [], totalCount: 25 })
    .mockResolvedValue({ data: [course(9, 'Omega')], totalCount: 25 });
  renderCourses(listCourses, '/courses?page=9');

  expect(await screen.findByText('Omega')).toBeInTheDocument();
  expect(listCourses).toHaveBeenLastCalledWith({ q: '', sort: '', page: 3, pageSize: 10 });
});

test('a failed request navigates to the error page', async () => {
  renderCourses(jest.fn().mockRejectedValue(new Error('boom')));
  expect(await screen.findByText('error page')).toBeInTheDocument();
});
