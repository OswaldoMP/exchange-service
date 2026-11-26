'use strict';

const { loadDotEnv, getConfig } = require('./infrastructure/config/env');
loadDotEnv();

const { createSqliteExchangeRepository } = require('./infrastructure/persistence/sqlite-exchange.repository');
const { createSmtpMailerAdapter } = require('./infrastructure/mail/smtp-mailer.adapter');
const { createAuthUseCases } = require('./application/use-cases/auth.use-cases');
const { createParticipantUseCases } = require('./application/use-cases/participant.use-cases');
const { createGiftUseCases } = require('./application/use-cases/gift.use-cases');
const { createExchangeUseCases } = require('./application/use-cases/exchange.use-cases');
const { createExpressApp } = require('./infrastructure/http/app');

function bootstrap(overrides = {}) {
  const config = { ...getConfig(), ...overrides };

  const repository =
    overrides.repository ||
    createSqliteExchangeRepository({
      dbPath: config.dbPath,
      adminSeed: config.admin,
      emailEnabledDefault: config.emailEnabledDefault,
    });

  const mailer =
    overrides.mailer ||
    createSmtpMailerAdapter({
      outboxDir: config.outboxDir,
    });

  const authUseCases = createAuthUseCases({ repository, mailer });
  const participantUseCases = createParticipantUseCases({ repository, mailer });
  const giftUseCases = createGiftUseCases({ repository });
  const exchangeUseCases = createExchangeUseCases({ repository });

  const app = createExpressApp({
    repository,
    authUseCases,
    participantUseCases,
    giftUseCases,
    exchangeUseCases,
    corsOrigins: config.corsOrigins,
    appUrl: config.appUrl,
  });

  return { app, repository, mailer, config };
}

if (require.main === module) {
  const { app, repository, config } = bootstrap();
  const server = app.listen(config.port, config.host, () => {
    console.log(
      `[exchange-service] Express + SQLite escuchando en http://${config.host}:${config.port}`
    );
    if (config.admin) {
      console.log(
        '[exchange-service] Super Admin verificado/creado desde variables de entorno (ADMIN_EMAIL / ADMIN_PASSWORD).'
      );
    } else {
      console.log(
        '[exchange-service] BD sin seed de admin automático (define ADMIN_EMAIL y ADMIN_PASSWORD para crear el Super Admin inicial).'
      );
    }
  });

  const shutdown = () => {
    server.close(() => {
      repository.close();
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

module.exports = {
  bootstrap,
};
