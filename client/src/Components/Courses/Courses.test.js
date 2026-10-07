import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Courses from './Courses';
import { renderWithContext, makeCourse, makePage, owner } from '../../test-utils';

const setup = (getCourses, options = {}) =>
  renderWithContext([{ path: '/courses', element: <Courses /> }], {
    route: '/courses',
    data: { getCourses },
    ...options,
  });

const lastCall = (mock) => mock.mock.calls[mock.mock.calls.length - 1];

describe('Courses list', () => {
  let consoleError;
  beforeEach(() => { consoleError = jest.spyOn(console, 'error').mockImplementation(() => {}); });
  afterEach(() => consoleError.mockRestore());

  test('shows a loading state and then the courses', async () => {
    const getCourses = jest.fn().mockResolvedValue(makePage([makeCourse({ id: 1, title: 'Alpha' }), makeCourse({ id: 2, title: 'Beta' })]));
    setup(getCourses);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
    expect(await screen.findByText('Alpha')).toBeInTheDocument();
    expect(screen.getByText('Beta')).toBeInTheDocument();
    expect(screen.getByText('2 courses')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /new course/i })).toBeInTheDocument();
    expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
  });

  test('requests the first page with defaults', async () => {
    const getCourses = jest.fn().mockResolvedValue(makePage([makeCourse()]));
    setup(getCourses);
    await screen.findByText('Course One');
    expect(getCourses).toHaveBeenCalledWith({ page: 1, limit: 9, q: '', sort: 'id', includeArchived: false }, null);
  });

  test('reads page, q and sort from the URL', async () => {
    const getCourses = jest.fn().mockResolvedValue(makePage([makeCourse()], { page: 2, totalPages: 3, total: 25 }));
    setup(getCourses, { route: '/courses?page=2&q=node&sort=-title' });
    await screen.findByText('Course One');
    expect(getCourses).toHaveBeenCalledWith({ page: 2, limit: 9, q: 'node', sort: '-title', includeArchived: false }, null);
    expect(screen.getByLabelText('Search courses')).toHaveValue('node');
    expect(screen.getByLabelText('Sort by')).toHaveValue('-title');
  });

  test('ignores invalid URL values', async () => {
    const getCourses = jest.fn().mockResolvedValue(makePage([makeCourse()]));
    setup(getCourses, { route: '/courses?page=-4&sort=password' });
    await screen.findByText('Course One');
    expect(getCourses).toHaveBeenCalledWith(expect.objectContaining({ page: 1, sort: 'id' }), null);
  });

  test('searching updates the URL, resets to page 1 and reloads', async () => {
    const getCourses = jest.fn().mockResolvedValue(makePage([makeCourse()], { page: 3, totalPages: 3, total: 25 }));
    setup(getCourses, { route: '/courses?page=3' });
    await screen.findByText('Course One');

    userEvent.type(screen.getByLabelText('Search courses'), '  react ');
    userEvent.click(screen.getByRole('button', { name: 'Search' }));

    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/courses?q=react'));
    await waitFor(() => expect(lastCall(getCourses)[0]).toEqual(expect.objectContaining({ q: 'react', page: 1 })));
  });

  test('pressing enter in the search box submits the search', async () => {
    const getCourses = jest.fn().mockResolvedValue(makePage([makeCourse()]));
    setup(getCourses);
    await screen.findByText('Course One');
    userEvent.type(screen.getByLabelText('Search courses'), 'css{enter}');
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('?q=css'));
  });

  test('changing the sort updates the URL and the request', async () => {
    const getCourses = jest.fn().mockResolvedValue(makePage([makeCourse()]));
    setup(getCourses);
    await screen.findByText('Course One');
    userEvent.selectOptions(screen.getByLabelText('Sort by'), '-title');
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/courses?sort=-title'));
    await waitFor(() => expect(lastCall(getCourses)[0].sort).toBe('-title'));
  });

  test('selecting the default sort removes it from the URL', async () => {
    const getCourses = jest.fn().mockResolvedValue(makePage([makeCourse()]));
    setup(getCourses, { route: '/courses?sort=title' });
    await screen.findByText('Course One');
    userEvent.selectOptions(screen.getByLabelText('Sort by'), 'id');
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent(/^\/courses$/));
  });

  describe('pagination', () => {
    const multiPage = (page) => makePage([makeCourse()], { page, totalPages: 3, total: 25 });

    test('shows the page indicator and disables Previous on the first page', async () => {
      setup(jest.fn().mockResolvedValue(multiPage(1)));
      await screen.findByText('Page 1 of 3');
      expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled();
    });

    test('Next and Previous change the page in the URL', async () => {
      const getCourses = jest.fn().mockImplementation(({ page }) => Promise.resolve(multiPage(page)));
      setup(getCourses);
      await screen.findByText('Page 1 of 3');

      userEvent.click(screen.getByRole('button', { name: 'Next' }));
      await screen.findByText('Page 2 of 3');
      expect(screen.getByTestId('location')).toHaveTextContent('/courses?page=2');

      userEvent.click(screen.getByRole('button', { name: 'Previous' }));
      await screen.findByText('Page 1 of 3');
      expect(screen.getByTestId('location')).toHaveTextContent(/^\/courses$/);
    });

    test('disables Next on the last page', async () => {
      setup(jest.fn().mockResolvedValue(multiPage(3)), { route: '/courses?page=3' });
      await screen.findByText('Page 3 of 3');
      expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
    });

    test('hides pagination when everything fits on one page', async () => {
      setup(jest.fn().mockResolvedValue(makePage([makeCourse()])));
      await screen.findByText('Course One');
      expect(screen.queryByRole('navigation', { name: 'Pagination' })).not.toBeInTheDocument();
    });

    test('moves to the last page when the requested page is past the end', async () => {
      const getCourses = jest.fn().mockImplementation(({ page }) =>
        Promise.resolve(page > 2
          ? makePage([], { page, totalPages: 2, total: 12 })
          : makePage([makeCourse()], { page, totalPages: 2, total: 12 })));
      setup(getCourses, { route: '/courses?page=7' });
      await screen.findByText('Page 2 of 2');
      expect(screen.getByTestId('location')).toHaveTextContent('/courses?page=2');
    });
  });

  describe('empty, error and recovery states', () => {
    test('shows an empty state when there are no courses', async () => {
      setup(jest.fn().mockResolvedValue(makePage([])));
      expect(await screen.findByText('There are no courses yet.')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /new course/i })).toBeInTheDocument();
    });

    test('shows a no-results message with a way to clear the search', async () => {
      const getCourses = jest.fn().mockResolvedValue(makePage([]));
      setup(getCourses, { route: '/courses?q=zzz' });
      expect(await screen.findByText('No courses match "zzz".')).toBeInTheDocument();

      userEvent.click(screen.getByRole('button', { name: 'Clear search' }));
      await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent(/^\/courses$/));
      expect(screen.getByLabelText('Search courses')).toHaveValue('');
    });

    test('shows an inline error and retries on request', async () => {
      const getCourses = jest.fn()
        .mockRejectedValueOnce(new Error('boom'))
        .mockResolvedValueOnce(makePage([makeCourse({ title: 'Recovered' })]));
      setup(getCourses);

      expect(await screen.findByRole('alert')).toHaveTextContent("We couldn't load the courses");
      expect(screen.getByTestId('location')).toHaveTextContent(/^\/courses$/);

      userEvent.click(screen.getByRole('button', { name: 'Try again' }));
      expect(await screen.findByText('Recovered')).toBeInTheDocument();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    test('keeps the search controls usable while in the error state', async () => {
      setup(jest.fn().mockRejectedValue(new Error('boom')));
      await screen.findByRole('alert');
      expect(screen.getByLabelText('Search courses')).toBeEnabled();
    });
  });

  describe('archived courses', () => {
    test('anonymous visitors do not see the archived toggle, even with ?archived=true', async () => {
      const getCourses = jest.fn().mockResolvedValue(makePage([makeCourse()]));
      setup(getCourses, { route: '/courses?archived=true' });
      await screen.findByText('Course One');
      expect(screen.queryByLabelText('Show my archived courses')).not.toBeInTheDocument();
      expect(getCourses).toHaveBeenCalledWith(expect.objectContaining({ includeArchived: false }), null);
    });

    test('signed-in users can include their archived courses, which show a badge', async () => {
      const getCourses = jest.fn().mockImplementation(({ includeArchived }) =>
        Promise.resolve(makePage(includeArchived
          ? [makeCourse({ id: 1, title: 'Live' }), makeCourse({ id: 2, title: 'Old one', archived: true })]
          : [makeCourse({ id: 1, title: 'Live' })])));
      setup(getCourses, { authUser: owner });
      await screen.findByText('Live');
      expect(screen.queryByText('Archived')).not.toBeInTheDocument();

      userEvent.click(screen.getByLabelText('Show my archived courses'));
      expect(await screen.findByText('Old one')).toBeInTheDocument();
      expect(screen.getByText('Archived')).toBeInTheDocument();
      expect(screen.getByTestId('location')).toHaveTextContent('/courses?archived=true');
      expect(lastCall(getCourses)[1]).toEqual({ username: owner.emailAddress, password: owner.password });
    });
  });
});
