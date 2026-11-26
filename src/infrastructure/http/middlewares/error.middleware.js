'use strict';

const { DomainError } = require('../../../domain/errors');

function errorMiddleware(err, _req, res, _next) {
  if (err instanceof DomainError) {
    res.status(err.statusCode).json({ error: { message: err.message } });
    return;
  }

  if (err?.type === 'entity.parse.failed' || err instanceof SyntaxError) {
    res.status(400).json({ error: { message: 'Invalid JSON payload' } });
    return;
  }

  console.error('[exchange-service] Unhandled error:', err);
  res.status(500).json({
    error: { message: err?.message || 'Internal server error' },
  });
}

module.exports = {
  errorMiddleware,
};
