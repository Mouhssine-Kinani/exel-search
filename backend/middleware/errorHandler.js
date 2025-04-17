/**
 * Global error handler middleware
 * Formats all errors into a consistent JSON structure
 */
function errorHandler(err, req, res, next) {
  // Default to 500 internal server error
  const statusCode = err.statusCode || 500;
  
  // Create standardized error response
  const errorResponse = {
    code: err.code || 'INTERNAL_SERVER_ERROR',
    message: err.message || 'An unexpected error occurred'
  };
  
  // Add stack trace in development environment
  if (process.env.NODE_ENV !== 'production') {
    errorResponse.stack = err.stack;
  }
  
  // Log the error (the logger middleware will handle this)
  req.log.error({ err, request: { method: req.method, url: req.url } }, 'Request error');
  
  // Send error response
  res.status(statusCode).json(errorResponse);
}

module.exports = errorHandler;
