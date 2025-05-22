import React from 'react';

const ErrorDisplay = ({ message }) => {
  if (!message) {
    return null;
  }
  return (
    <div className="alert alert-danger text-center" role="alert">
      {message}
    </div>
  );
};

export default ErrorDisplay;
