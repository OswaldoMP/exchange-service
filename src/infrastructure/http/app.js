'use strict';

const express = require('express');
const cors = require('cors');
const { createAuthMiddlewares } = require('./middlewares/auth.middleware');
const { errorMiddleware } = require('./middlewares/error.middleware');
const { createHealthRouter } = require('./routes/health.routes');
const { createAuthRouter } = require('./routes/auth.routes');
const { createParticipantRouter } = require('./routes/participant.routes');
const { createGiftRouter } = require('./routes/gift.routes');
const { createExchangeRouter } = require('./routes/exchange.routes');

function createExpressApp({
  repository,
  authUseCases,
  participantUseCases,
  giftUseCases,
  exchangeUseCases,
  corsOrigins = '*',
  appUrl = 'http://localhost:4200',
}) {
  const app = express();
  app.set('trust proxy', 1);

  const corsConfig =
    corsOrigins === '*'
      ? { origin: true, credentials: false }
      : {
          origin(origin, callback) {
            if (!origin || corsOrigins.includes(origin)) {
              callback(null, true);
            } else {
              callback(null, false);
            }
          },
        };

  app.use(cors(corsConfig));
  app.use(express.json({ limit: '1mb' }));

  const resolveAppUrl = (req) => {
    if (process.env.APP_URL) {
      return process.env.APP_URL.replace(/\/$/, '');
    }
    const origin = req.headers.origin;
    if (origin && /^https?:\/\//i.test(origin)) {
      return origin.replace(/\/$/, '');
    }
    return appUrl.replace(/\/$/, '');
  };

  const authMiddlewares = createAuthMiddlewares({ repository });

  const healthRouter = createHealthRouter();
  app.use('/api/health', healthRouter);
  app.get('/', (_req, res) => {
    res.status(200).json({
      status: 'ok',
      service: 'exchange-service',
      event: 'Intercambio Navideño 2026',
    });
  });
  app.use('/api/auth', createAuthRouter({ authUseCases, resolveAppUrl }));
  app.use(
    '/api/participants',
    createParticipantRouter({
      participantUseCases,
      authMiddlewares,
      resolveAppUrl,
    })
  );
  app.use('/api/gifts', createGiftRouter({ giftUseCases }));
  app.use('/api/exchanges', createExchangeRouter({ exchangeUseCases, authMiddlewares }));

  app.use((_req, res) => {
    res.status(404).json({ error: { message: 'Route not found' } });
  });

  app.use(errorMiddleware);

  return app;
}

module.exports = {
  createExpressApp,
};
