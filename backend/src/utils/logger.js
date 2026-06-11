const { createLogger, format, transports } = require('winston');
const path = require('path');

const { combine, timestamp, printf, colorize, errors, json } = format;

const isProd = process.env.NODE_ENV === 'production';

const devFormat = combine(
  colorize(),
  timestamp({ format: 'HH:mm:ss' }),
  errors({ stack: true }),
  printf(({ level, message, timestamp: ts, stack, ...meta }) => {
    const extra = Object.keys(meta).length ? ' ' + JSON.stringify(meta) : '';
    return `${ts} ${level}: ${stack || message}${extra}`;
  })
);

const prodFormat = combine(
  timestamp(),
  errors({ stack: true }),
  json()
);

const logger = createLogger({
  level: isProd ? 'info' : 'debug',
  format: isProd ? prodFormat : devFormat,
  transports: [
    new transports.Console(),
    ...(isProd ? [
      new transports.File({
        filename: path.join(__dirname, '../../logs/error.log'),
        level: 'error',
        maxsize: 10 * 1024 * 1024,  // 10 MB
        maxFiles: 5,
      }),
      new transports.File({
        filename: path.join(__dirname, '../../logs/combined.log'),
        maxsize: 20 * 1024 * 1024,  // 20 MB
        maxFiles: 10,
      }),
    ] : []),
  ],
});

module.exports = logger;
