import pino from 'pino';

export const logger = pino({
  name: 'bridge',
  level: process.env['LOG_LEVEL'] ?? 'info',
});
