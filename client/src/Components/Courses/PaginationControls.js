import React from 'react';

const PaginationControls = ({ page, totalPages, onPageChange }) => (
  <nav className="pagination" aria-label="Pagination">
    <button
      type="button"
      className="button button-secondary"
      disabled={page <= 1}
      onClick={() => onPageChange(page - 1)}
    >
      Previous
    </button>
    <span className="pagination--status">Page {page} of {totalPages}</span>
    <button
      type="button"
      className="button button-secondary"
      disabled={page >= totalPages}
      onClick={() => onPageChange(page + 1)}
    >
      Next
    </button>
  </nav>
);

export default PaginationControls;
