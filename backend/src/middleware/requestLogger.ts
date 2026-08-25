import pinoHttp from 'pino-http';
import { logger } from '../config/logger';

export const requestLogger = pinoHttp({
  logger,
  redact: { paths: ['req.headers.authorization', 'req.headers.cookie'], censor: '[redacted]' },
  autoLogging: {
    ignore: (req) => (req.url ?? '').startsWith('/api/docs')
  }
});
