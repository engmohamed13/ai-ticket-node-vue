import cors from 'cors';
import express, { Express } from 'express';
import swaggerUi from 'swagger-ui-express';
import { API_PREFIX, env } from './config/env';
import { openApiDocument } from './docs/openapi';
import { globalErrorHandler } from './middleware/error.middleware';
import { notFoundMiddleware } from './middleware/notFound.middleware';
import { requestLogger } from './middleware/requestLogger';
import routes from './routes';
import { ok } from './utils/apiResponse';

export const createApp = (): Express => {
  const app = express();

  app.use(requestLogger);
  app.use(cors({ origin: env.CORS_ORIGIN }));
  app.use(express.json());

  app.get('/', (_req, res) => {
    res.json(ok(null, 'CustomerSupportCRM API'));
  });

  app.use(`${API_PREFIX}/docs`, swaggerUi.serve, swaggerUi.setup(openApiDocument));
  app.get(`${API_PREFIX}/docs.json`, (_req, res) => {
    res.json(openApiDocument);
  });

  app.use(API_PREFIX, routes);

  app.use(notFoundMiddleware);
  app.use(globalErrorHandler);

  return app;
};

export default createApp();
