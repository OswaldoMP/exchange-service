'use strict';

const express = require('express');

function createExchangeRouter({ exchangeUseCases, authMiddlewares }) {
  const router = express.Router();
  const { requireAdmin } = authMiddlewares;

  router.get('/current', (_req, res, next) => {
    try {
      const exchange = exchangeUseCases.getCurrentExchange();
      res.status(200).json(exchange);
    } catch (err) {
      next(err);
    }
  });

  router.put('/current', requireAdmin, (req, res, next) => {
    try {
      const updated = exchangeUseCases.updateCurrentExchange(req.body);
      res.status(200).json(updated);
    } catch (err) {
      next(err);
    }
  });

  return router;
}

module.exports = {
  createExchangeRouter,
};
