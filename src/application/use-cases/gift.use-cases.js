'use strict';

const { DomainError } = require('../../domain/errors');

function createGiftUseCases({ repository }) {
  function listGifts({ participantId }) {
    return participantId
      ? repository.getGiftsByParticipantId(participantId)
      : repository.getAllGifts();
  }

  function createGift({ participant_id, title, store, link }) {
    if (!participant_id || !String(title || '').trim()) {
      throw new DomainError(400, 'participant_id and title are required');
    }
    return repository.saveGift({ participant_id, title, store, link });
  }

  function updateGift({ giftId, title, store, link, removed }) {
    const updated = repository.updateGift(giftId, {
      title,
      store,
      link,
      removed,
    });
    if (!updated) {
      throw new DomainError(404, 'Gift not found');
    }
    return updated;
  }

  return {
    listGifts,
    createGift,
    updateGift,
  };
}

module.exports = {
  createGiftUseCases,
};
