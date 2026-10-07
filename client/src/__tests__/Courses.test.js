import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Courses from '../Components/Courses/Courses';
import { renderWithProviders, makeData, makeCourse, makeMeta } from '../testUtils';

const location = () => screen.getByTestId('location').textContent;
const lastCall = (data) => data.getCourses.mock.calls[data.getCourses.mock.calls.length - 1][0];

describe('Courses catalog', () => {
  test('renders the course cards returned by the API', async () => {
    renderWithProviders(<Courses />, { route: '/courses' });

    expect(await screen.findByText('Course 1')).toBeInTheDocument();
    expect(screen.getByText('Course 2')).toBeInTheDocument();
    expect(screen.getByText('New Course')).toBeInTheDocument();
    expect(screen.getByText('Page 1 of 1')).toBeInTheDocument();
  });

  test('submitting a search updates the URL, resets to page 1 and refetches', async () => {
    const { data } = renderWithProviders(<Courses />, { route: '/courses?page=3' });
    await screen.findByText('Course 1');

    userEvent.type(screen.getByLabelText('Search'), '  react hooks ');
    userEvent.click(screen.getByRole('button', { name: 'Search' }));

    await waitFor(() => expect(lastCall(data)).toMatchObject({ q: 'react hooks', page: 1 }));
    expect(location()).toBe('/courses?q=react+hooks');
  });

  test('Clear removes the search term and restores the full list', async () => {
    const { data } = renderWithProviders(<Courses />, { route: '/courses?q=react' });
    await screen.findByText('Course 1');
    expect(screen.getByLabelText('Search')).toHaveValue('react');

    userEvent.click(screen.getByRole('button', { name: 'Clear' }));

    await waitFor(() => expect(lastCall(data).q).toBe(''));
    expect(screen.getByLabelText('Search')).toHaveValue('');
    expect(location()).toBe('/courses');
  });

  test('shows the empty state and keeps the toolbar when nothing matches', async () => {
    const data = makeData({
      getCourses: jest.fn().mockResolvedValue({ items: [], meta: makeMeta({ totalCount: 0, totalPages: 0 }) }),
    });
    renderWithProviders(<Courses />, { route: '/courses?q=zzz', data });

    expect(await screen.findByText('No courses match your search.')).toBeInTheDocument();
    expect(screen.queryByText('Course 1')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Search')).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Pagination' })).not.toBeInTheDocument();
  });

  describe('pagination', () => {
    // Behaves like the API: honours the requested page, but never returns one beyond totalPages
    const pagedData = (_ignored, totalPages = 3) => makeData({
      getCourses: jest.fn(({ page }) => {
        const current = Math.min(page, totalPages);
        return Promise.resolve({
          items: [makeCourse(current)],
          meta: makeMeta({ page: current, totalPages, totalCount: totalPages * 12 }),
        });
      }),
    });

    test('Previous is disabled on the first page and Next moves forward via the URL', async () => {
      const data = pagedData(1);
      renderWithProviders(<Courses />, { route: '/courses', data });
      await screen.findByText('Page 1 of 3');

      expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();
      userEvent.click(screen.getByRole('button', { name: 'Next' }));

      await waitFor(() => expect(lastCall(data).page).toBe(2));
      expect(location()).toBe('/courses?page=2');
    });

    test('Next is disabled on the last page', async () => {
      renderWithProviders(<Courses />, { route: '/courses?page=3', data: pagedData(3) });
      await screen.findByText('Page 3 of 3');

      expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Previous' })).toBeEnabled();
    });

    test('an invalid page in the URL is coerced to page 1', async () => {
      const data = pagedData(1);
      renderWithProviders(<Courses />, { route: '/courses?page=abc', data });
      await screen.findByText('Page 1 of 3');

      expect(data.getCourses.mock.calls[0][0].page).toBe(1);
      await waitFor(() => expect(location()).toBe('/courses'));
    });

    test('an out-of-range page is replaced by the page the API actually returned', async () => {
      renderWithProviders(<Courses />, { route: '/courses?page=99', data: pagedData(3) });
      await screen.findByText('Page 3 of 3');

      await waitFor(() => expect(location()).toBe('/courses?page=3'));
    });
  });

  describe('owner filter and sort', () => {
    test('changing the owner keeps q and sort, resets the page and updates the URL', async () => {
      const { data } = renderWithProviders(<Courses />, { route: '/courses?q=react&sort=title_asc&page=2' });
      await screen.findByText('Course 1');
      await screen.findByRole('option', { name: 'Bella Bell' });

      userEvent.selectOptions(screen.getByLabelText('Owner'), 'Bella Bell');

      await waitFor(() => expect(lastCall(data)).toMatchObject({ q: 'react', sort: 'title_asc', ownerId: 2, page: 1 }));
      expect(location()).toBe('/courses?q=react&ownerId=2&sort=title_asc');
    });

    test('changing the sort keeps the owner filter and resets the page', async () => {
      const { data } = renderWithProviders(<Courses />, { route: '/courses?ownerId=2&page=2' });
      await screen.findByText('Course 1');

      userEvent.selectOptions(screen.getByLabelText('Sort'), 'Title (A-Z)');

      await waitFor(() => expect(lastCall(data)).toMatchObject({ ownerId: 2, sort: 'title_asc', page: 1 }));
      expect(location()).toBe('/courses?ownerId=2&sort=title_asc');
    });

    test('filter and sort are restored from the URL on load', async () => {
      const { data } = renderWithProviders(<Courses />, { route: '/courses?ownerId=2&sort=title_asc' });
      await screen.findByText('Course 1');
      await screen.findByRole('option', { name: 'Bella Bell' });

      expect(lastCall(data)).toMatchObject({ ownerId: 2, sort: 'title_asc' });
      expect(screen.getByLabelText('Owner')).toHaveValue('2');
      expect(screen.getByLabelText('Sort')).toHaveValue('title_asc');
    });

    test('an invalid sort in the URL falls back to Newest', async () => {
      const { data } = renderWithProviders(<Courses />, { route: '/courses?sort=bogus' });
      await screen.findByText('Course 1');

      expect(data.getCourses.mock.calls[0][0].sort).toBe('newest');
      expect(screen.getByLabelText('Sort')).toHaveValue('newest');
      await waitFor(() => expect(location()).toBe('/courses'));
    });
  });
});
