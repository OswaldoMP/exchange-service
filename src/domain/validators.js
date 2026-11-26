'use strict';

const { VALID_ROLES } = require('./constants');
const { DomainError } = require('./errors');

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function assertValidRole(role) {
  if (!VALID_ROLES.has(role)) {
    throw new DomainError(400, 'Rol inválido. Debe ser admin o participant.');
  }
}

function validateSecretSantaAssignments(assignments) {
  if (!Array.isArray(assignments) || assignments.length < 2) {
    throw new DomainError(400, 'Se necesitan al menos 2 asignaciones válidas.');
  }

  const seenGivers = new Set();
  const seenReceivers = new Set();
  const normalized = [];

  for (const assign of assignments) {
    const giverId = Number(assign.id);
    const receiverId = Number(assign.friend_id);

    if (!Number.isInteger(giverId) || !Number.isInteger(receiverId)) {
      throw new DomainError(
        400,
        'Todas las asignaciones deben tener participante y amigo secreto válidos.'
      );
    }
    if (giverId === receiverId) {
      throw new DomainError(
        400,
        'Un participante no puede ser su propio amigo secreto.'
      );
    }
    if (seenGivers.has(giverId)) {
      throw new DomainError(
        400,
        'Hay un participante duplicado en las asignaciones.'
      );
    }
    if (seenReceivers.has(receiverId)) {
      throw new DomainError(
        400,
        'Un mismo amigo secreto fue asignado a más de un participante.'
      );
    }
    seenGivers.add(giverId);
    seenReceivers.add(receiverId);
    normalized.push({ id: giverId, friend_id: receiverId });
  }

  return normalized;
}

module.exports = {
  normalizeEmail,
  assertValidRole,
  validateSecretSantaAssignments,
};
