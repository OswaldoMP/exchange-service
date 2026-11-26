'use strict';

const express = require('express');
const { extractBearerToken } = require('../middlewares/auth.middleware');

function createAuthRouter({ authUseCases, resolveAppUrl }) {
  const router = express.Router();

  router.post('/signup', async (req, res, next) => {
    try {
      const { email, password, username } = req.body || {};
      const { status, payload } = await authUseCases.signUp({
        email,
        password,
        username,
        appUrl: resolveAppUrl(req),
      });
      res.status(status).json(payload);
    } catch (err) {
      next(err);
    }
  });

  router.post('/confirm', (req, res, next) => {
    try {
      const { status, payload } = authUseCases.confirmEmail({
        token: req.body?.token,
      });
      res.status(status).json(payload);
    } catch (err) {
      next(err);
    }
  });

  router.post('/resend-confirmation', async (req, res, next) => {
    try {
      const { status, payload } = await authUseCases.resendConfirmation({
        email: req.body?.email,
        appUrl: resolveAppUrl(req),
      });
      res.status(status).json(payload);
    } catch (err) {
      next(err);
    }
  });

  router.post('/signin', (req, res, next) => {
    try {
      const { email, password } = req.body || {};
      const { status, payload } = authUseCases.signIn({ email, password });
      res.status(status).json(payload);
    } catch (err) {
      next(err);
    }
  });

  router.post('/signout', (req, res, next) => {
    try {
      const { status, payload } = authUseCases.signOut({
        token: extractBearerToken(req),
      });
      res.status(status).json(payload);
    } catch (err) {
      next(err);
    }
  });

  router.get('/session', (req, res, next) => {
    try {
      const { status, payload } = authUseCases.getSession({
        token: extractBearerToken(req),
      });
      res.status(status).json(payload);
    } catch (err) {
      next(err);
    }
  });

  router.get('/user', (req, res, next) => {
    try {
      const { status, payload } = authUseCases.getUserByToken({
        token: extractBearerToken(req),
      });
      res.status(status).json(payload);
    } catch (err) {
      next(err);
    }
  });

  return router;
}

module.exports = {
  createAuthRouter,
};
