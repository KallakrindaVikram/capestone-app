import React from 'react';

const EmptyState = ({ message = 'No courses match your search.' }) => (
  <p className="empty--state" role="status">{message}</p>
);

export default EmptyState;
