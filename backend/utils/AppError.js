/**
 * Custom application error class
 * Provides a standardized way to create errors with status codes and error codes
 */
class AppError extends Error {
  /**
   * Create a new application error
   * @param {string} message - Error message
   * @param {string} code - Error code (e.g., 'FILE_NOT_FOUND')
   * @param {number} statusCode - HTTP status code
   */
  constructor(message, code, statusCode = 500) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
