const pino = require("pino");

let transport;

if (process.env.NODE_ENV !== "production") {
  try {
    transport = pino.transport({
      target: "pino-pretty",
      options: {
        colorize: true,
        singleLine: false,
        translateTime: "SYS:standard",
        ignore: "pid,hostname"
      }
    });
  } catch (err) {
    transport = undefined;
  }
}

const logger = pino(
  {
    level: process.env.LOG_LEVEL || "info"
  },
  transport
);

module.exports = logger;