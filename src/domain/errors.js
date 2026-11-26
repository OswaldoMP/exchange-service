'use strict';

class DomainError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.name = 'DomainError';
    this.statusCode = statusCode;
  }
}

module.exports = {
  DomainError,
};
