const pino = require('pino');
const pinoHttp = require('pino-http');
const { v4: uuidv4 } = require('uuid');

// Create a custom pino logger instance
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    level: (label) => {
      return { level: label };
    }
  }
});

// Create HTTP logger middleware
const httpLogger = pinoHttp({
  logger,
  genReqId: (req) => req.id || uuidv4(),
  customSuccessMessage: (req, res) => `${req.method} ${req.url} completed with status ${res.statusCode}`,
  customErrorMessage: (req, res) => `${req.method} ${req.url} failed with status ${res.statusCode}`,
  customProps: (req, res) => {
    return {
      userAgent: req.headers['user-agent'],
      contentLength: req.headers['content-length'],
      responseTime: res.responseTime
    };
  }
});

module.exports = httpLogger;
