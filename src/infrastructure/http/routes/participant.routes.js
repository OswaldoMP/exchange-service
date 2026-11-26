'use strict';

const express = require('express');

function createParticipantRouter({
  participantUseCases,
  authMiddlewares,
  resolveAppUrl,
}) {
  const router = express.Router();
  const { requireAuth, requireAdmin } = authMiddlewares;

  router.get('/', (req, res, next) => {
    try {
      const excludeOauthId =
        typeof req.query.excludeOauthId === 'string'
          ? req.query.excludeOauthId
          : '';
      const list = participantUseCases.listParticipants({ excludeOauthId });
      res.status(200).json(list);
    } catch (err) {
      next(err);
    }
  });

  router.get('/by-oauth/:oauthId', (req, res, next) => {
    try {
      const participant = participantUseCases.getParticipantByOauthId({
        oauthId: req.params.oauthId,
      });
      res.status(200).json(participant);
    } catch (err) {
      next(err);
    }
  });

  router.post('/', (req, res, next) => {
    try {
      const { name, oauth_id, avatarUrl } = req.body || {};
      const saved = participantUseCases.saveParticipant({
        name,
        oauth_id,
        avatarUrl,
      });
      res.status(201).json(saved);
    } catch (err) {
      next(err);
    }
  });

  router.patch('/by-oauth/:oauthId/ready', (req, res, next) => {
    try {
      const result = participantUseCases.setParticipantReady({
        oauthId: req.params.oauthId,
        isReady: req.body?.is_ready,
      });
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  });

  router.patch('/by-oauth/:oauthId/wheel', requireAuth, (req, res, next) => {
    try {
      const updated = participantUseCases.updateOwnWheelStatus({
        oauthId: req.params.oauthId,
        wheelPlayed: req.body?.wheel_played,
        sessionUserId: req.auth.userId,
        isAdmin: req.auth.isAdmin,
      });
      res.status(200).json(updated);
    } catch (err) {
      next(err);
    }
  });

  router.patch('/:id/wheel', requireAdmin, (req, res, next) => {
    try {
      const updated = participantUseCases.adminUpdateWheelStatus({
        participantId: req.params.id,
        wheelPlayed: req.body?.wheel_played,
      });
      res.status(200).json(updated);
    } catch (err) {
      next(err);
    }
  });

  router.patch('/:id/role', requireAdmin, (req, res, next) => {
    try {
      const updated = participantUseCases.updateParticipantRole({
        participantId: req.params.id,
        role: req.body?.role,
        requesterOauthId: req.auth.userId,
      });
      res.status(200).json(updated);
    } catch (err) {
      next(err);
    }
  });

  router.post('/assign', requireAdmin, async (req, res, next) => {
    try {
      const result = await participantUseCases.assignSecretSanta({
        assignments: req.body?.assignments,
        preserveUnchangedWheel: req.body?.preserveUnchangedWheel,
        sendNotifications: req.body?.sendNotifications,
        appUrl: resolveAppUrl(req),
      });
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  });

  router.post('/notify-draw', requireAdmin, async (req, res, next) => {
    try {
      const result = await participantUseCases.notifyDraw({
        participantId: req.body?.participantId,
        isReassignment: req.body?.isReassignment,
        appUrl: resolveAppUrl(req),
      });
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  });

  return router;
}

module.exports = {
  createParticipantRouter,
};
