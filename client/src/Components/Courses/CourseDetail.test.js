import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CourseDetail from './CourseDetail';
import NotFound from '../Errors/NotFound';
import { renderWithContext, makeCourse, owner } from '../../test-utils';

jest.mock('react-markdown', () => ({ children }) => <div>{children}</div>);

const stranger = { id: 2, firstName: 'Sam', lastName: 'Stranger', emailAddress: 'sam@example.com', password: 'strangerpass' };

const setup = (data, { authUser = null, id = 1 } = {}) =>
  renderWithContext([
    { path: '/courses/:id', element: <CourseDetail /> },
    { path: '/notfound', element: <NotFound /> },
    { path: '/error', element: <h2>Unhandled error page</h2> },
  ], { route: `/courses/${id}`, authUser, data });

describe('CourseDetail', () => {
  let consoleError;
  beforeEach(() => { consoleError = jest.spyOn(console, 'error').mockImplementation(() => {}); });
  afterEach(() => consoleError.mockRestore());

  test('renders the course; visitors get no owner actions', async () => {
    setup({ getCourse: jest.fn().mockResolvedValue(makeCourse({ title: 'Intro' })) });
    expect(await screen.findByText('Intro')).toBeInTheDocument();
    expect(screen.getByText(/By Olive Owner/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /archive/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Update Course' })).not.toBeInTheDocument();
    expect(screen.queryByText('Archived')).not.toBeInTheDocument();
  });

  test('signed-in non-owners get no owner actions', async () => {
    setup({ getCourse: jest.fn().mockResolvedValue(makeCourse()) }, { authUser: stranger });
    await screen.findByText('Course One');
    expect(screen.queryByRole('button', { name: /archive/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete Course' })).not.toBeInTheDocument();
  });

  test('sends credentials when signed in so owners can view archived courses', async () => {
    const getCourse = jest.fn().mockResolvedValue(makeCourse());
    setup({ getCourse }, { authUser: owner });
    await screen.findByText('Course One');
    expect(getCourse).toHaveBeenCalledWith('1', { username: owner.emailAddress, password: owner.password });
  });

  test('anonymous requests send no credentials', async () => {
    const getCourse = jest.fn().mockResolvedValue(makeCourse());
    setup({ getCourse });
    await screen.findByText('Course One');
    expect(getCourse).toHaveBeenCalledWith('1', null);
  });

  test('owners see Update, Archive and Delete actions', async () => {
    setup({ getCourse: jest.fn().mockResolvedValue(makeCourse()) }, { authUser: owner });
    expect(await screen.findByRole('link', { name: 'Update Course' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Archive Course' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete Course' })).toBeInTheDocument();
  });

  test('archiving calls the API and shows the archived badge and Unarchive button', async () => {
    const archiveCourse = jest.fn().mockResolvedValue([]);
    setup({ getCourse: jest.fn().mockResolvedValue(makeCourse()), archiveCourse }, { authUser: owner });
    userEvent.click(await screen.findByRole('button', { name: 'Archive Course' }));

    expect(await screen.findByRole('button', { name: 'Unarchive Course' })).toBeInTheDocument();
    expect(archiveCourse).toHaveBeenCalledWith('1', owner.emailAddress, owner.password);
    expect(screen.getByRole('status')).toHaveTextContent('Archived');
  });

  test('an archived course shows the badge and can be unarchived', async () => {
    const unarchiveCourse = jest.fn().mockResolvedValue([]);
    setup({ getCourse: jest.fn().mockResolvedValue(makeCourse({ archived: true })), unarchiveCourse }, { authUser: owner });
    expect(await screen.findByRole('status')).toHaveTextContent('Archived');

    userEvent.click(screen.getByRole('button', { name: 'Unarchive Course' }));
    expect(await screen.findByRole('button', { name: 'Archive Course' })).toBeInTheDocument();
    expect(unarchiveCourse).toHaveBeenCalledWith('1', owner.emailAddress, owner.password);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  test('shows API errors and leaves the state unchanged when archiving is refused', async () => {
    const archiveCourse = jest.fn().mockResolvedValue(['You are not authorised to archive this course.']);
    setup({ getCourse: jest.fn().mockResolvedValue(makeCourse()), archiveCourse }, { authUser: owner });
    userEvent.click(await screen.findByRole('button', { name: 'Archive Course' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('not authorised');
    expect(screen.getByRole('button', { name: 'Archive Course' })).toBeInTheDocument();
  });

  test('redirects to the Not Found page when the course does not exist', async () => {
    setup({ getCourse: jest.fn().mockResolvedValue(null) }, { id: 999 });
    expect(await screen.findByRole('heading', { name: 'Not Found' })).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/notfound');
  });

  test('redirects to Not Found without crashing when a signed-in user opens a missing course', async () => {
    setup({ getCourse: jest.fn().mockResolvedValue(null) }, { id: 999, authUser: owner });
    expect(await screen.findByRole('heading', { name: 'Not Found' })).toBeInTheDocument();
  });

  test('redirects to the error page when the request fails', async () => {
    setup({ getCourse: jest.fn().mockRejectedValue(new Error('boom')) });
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/error'));
  });
});
