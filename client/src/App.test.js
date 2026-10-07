import React from 'react';
import { screen } from '@testing-library/react';
import App from './App';
import { renderWithContext, makeCourse, makePage } from './test-utils';

jest.mock('react-markdown', () => ({ children }) => <div>{children}</div>);

const renderApp = (route, data) => renderWithContext([{ path: '/*', element: <App /> }], { route, data });

describe('App routing', () => {
  let consoleError;
  beforeEach(() => { consoleError = jest.spyOn(console, 'error').mockImplementation(() => {}); });
  afterEach(() => consoleError.mockRestore());

  test('/ redirects to the course catalog', async () => {
    renderApp('/', { getCourses: jest.fn().mockResolvedValue(makePage([makeCourse({ title: 'Home course' })])) });
    expect(await screen.findByText('Home course')).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/courses');
  });

  test('a missing course routes to the Not Found page', async () => {
    renderApp('/courses/999', { getCourse: jest.fn().mockResolvedValue(null) });
    expect(await screen.findByRole('heading', { name: 'Not Found' })).toBeInTheDocument();
  });

  test('an unknown URL renders the Not Found page', async () => {
    renderApp('/definitely/not/here', {});
    expect(await screen.findByRole('heading', { name: 'Not Found' })).toBeInTheDocument();
  });
});
