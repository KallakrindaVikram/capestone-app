import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Context from './Context';
import App from './App';

// react-markdown ships ESM only, which Jest (CRA) cannot parse; the catalog does not use it
jest.mock('react-markdown', () => () => null);

const renderApp = (url) => {
  const data = {
    getCourses: jest.fn(() => Promise.resolve([
      { id: 1, title: 'React Fundamentals', description: 'd', updatedAt: '2026-09-25T08:00:00.000Z', User: { id: 1, firstName: 'Joe', lastName: 'Smith' } },
    ])),
  };
  render(
    <Context.Context.Provider value={{ data, authenticatedUser: null, actions: {} }}>
      <MemoryRouter initialEntries={[url]}>
        <App />
      </MemoryRouter>
    </Context.Context.Provider>
  );
  return data;
};

test('the root route redirects to the course catalog with its controls', async () => {
  renderApp('/');
  expect(await screen.findByText('React Fundamentals')).toBeInTheDocument();
  expect(screen.getByLabelText('Search courses')).toBeInTheDocument();
  expect(screen.getByLabelText('Author')).toBeInTheDocument();
  expect(screen.getByLabelText('Sort by')).toBeInTheDocument();
});

test('catalog query string is passed to the API', async () => {
  const data = renderApp('/courses?q=react&sort=title&order=asc');
  await screen.findByText('React Fundamentals');
  expect(data.getCourses).toHaveBeenCalledWith({ q: 'react', userId: '', sort: 'title', order: 'asc' });
});
