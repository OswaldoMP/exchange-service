'use strict';

const express = require('express');

function createGiftRouter({ giftUseCases }) {
  const router = express.Router();

  router.get('/', (req, res, next) => {
    try {
      const participantId =
        typeof req.query.participantId === 'string'
          ? req.query.participantId
          : '';
      const gifts = giftUseCases.listGifts({ participantId });
      res.status(200).json(gifts);
    } catch (err) {
      next(err);
    }
  });

  router.post('/', (req, res, next) => {
    try {
      const { participant_id, title, store, link } = req.body || {};
      const created = giftUseCases.createGift({
        participant_id,
        title,
        store,
        link,
      });
      res.status(201).json(created);
    } catch (err) {
      next(err);
    }
  });

  router.put('/:id', (req, res, next) => {
    try {
      const { title, store, link, removed } = req.body || {};
      const updated = giftUseCases.updateGift({
        giftId: req.params.id,
        title,
        store,
        link,
        removed,
      });
      res.status(200).json(updated);
    } catch (err) {
      next(err);
    }
  });

  return router;
}

module.exports = {
  createGiftRouter,
};
