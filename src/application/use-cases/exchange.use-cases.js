'use strict';

const { DomainError } = require('../../domain/errors');

function createExchangeUseCases({ repository }) {
  function getCurrentExchange() {
    const exchange = repository.getInfoEvent();
    if (!exchange) {
      throw new DomainError(404, 'Exchange not found');
    }
    return exchange;
  }

  function updateCurrentExchange(payload) {
    const updated = repository.updateInfoEvent(payload || {});
    if (!updated) {
      throw new DomainError(404, 'Exchange not found');
    }
    return updated;
  }

  return {
    getCurrentExchange,
    updateCurrentExchange,
  };
}

module.exports = {
  createExchangeUseCases,
};
