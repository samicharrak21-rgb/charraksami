const logger = require('./logger');

function installGlobalHandlers() {
  process.on('unhandledRejection', (reason, p) => {
    logger.error({ reason, p }, 'Unhandled Rejection');
  });

  process.on('uncaughtException', (err) => {
    logger.fatal({ err }, 'Uncaught Exception');
    // do not exit in production hosts like Railway automatically
  });

  process.on('warning', (warning) => {
    logger.warn({ warning }, 'Process warning');
  });
}

module.exports = { installGlobalHandlers };
