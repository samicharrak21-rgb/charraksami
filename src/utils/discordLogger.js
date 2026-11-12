// Enhanced Discord.js logger for Railway
const { createLogger } = require('pino');

const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'HH:MM:ss Z',
      ignore: 'pid,hostname'
    }
  }
});

// Discord.js specific logger
const discordLogger = {
  info: (message, meta = {}) => {
    logger.info(meta, message);
  },
  warn: (message, meta = {}) => {
    logger.warn(meta, message);
  },
  error: (message, meta = {}) => {
    logger.error(meta, message);
  },
  debug: (message, meta = {}) => {
    logger.debug(meta, message);
  }
};

module.exports = discordLogger;
