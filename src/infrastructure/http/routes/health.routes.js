'use strict';

const express = require('express');

function createHealthRouter() {
  const router = express.Router();

  router.get('/', (_req, res) => {
    res.status(200).json({
      status: 'ok',
      service: 'exchange-service',
      event: 'Intercambio Navideño 2026',
    });
  });

  return router;
}

module.exports = {
  createHealthRouter,
};
