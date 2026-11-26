'use strict';

const { DomainError } = require('../../domain/errors');
const {
  assertValidRole,
  validateSecretSantaAssignments,
} = require('../../domain/validators');

function createParticipantUseCases({ repository, mailer }) {
  async function notifyTargets({ participantIds, isReassignment, appUrl }) {
    if (!repository.isEmailFeatureEnabled()) {
      return {
        notifiedCount: 0,
        emailMode: 'disabled',
      };
    }

    const targets = repository.getNotificationTargets(participantIds);
    const eventConfig = repository.getInfoEvent();
    let notifiedCount = 0;

    for (const target of targets) {
      try {
        await mailer.sendSecretSantaNotification({
          to: target.email,
          participantName: target.name,
          friendName: target.friendName,
          appUrl,
          eventConfig,
          isReassignment,
        });
        notifiedCount += 1;
      } catch (err) {
        console.error(`[Mailer] Error notifying ${target.id}:`, err.message);
      }
    }

    return {
      notifiedCount,
      emailMode: mailer.isSmtpConfigured() ? 'smtp' : 'local-outbox',
    };
  }

  function listParticipants({ excludeOauthId }) {
    return excludeOauthId
      ? repository.getParticipantsExcept(excludeOauthId)
      : repository.getAllParticipants();
  }

  function getParticipantByOauthId({ oauthId }) {
    const participant = repository.getParticipantByOauthId(oauthId);
    if (!participant) {
      throw new DomainError(404, 'Participant not found');
    }
    return participant;
  }

  function saveParticipant({ name, oauth_id, avatarUrl }) {
    return repository.saveParticipant({ name, oauth_id, avatarUrl });
  }

  function setParticipantReady({ oauthId, isReady }) {
    return repository.updateParticipantReady(oauthId, Boolean(isReady));
  }

  function updateOwnWheelStatus({ oauthId, wheelPlayed, sessionUserId, isAdmin }) {
    if (sessionUserId !== oauthId && !isAdmin) {
      throw new DomainError(403, 'Forbidden');
    }
    const updated = repository.updateParticipantWheelByOauthId(
      oauthId,
      Boolean(wheelPlayed)
    );
    if (!updated) {
      throw new DomainError(404, 'Participant not found');
    }
    return updated;
  }

  function adminUpdateWheelStatus({ participantId, wheelPlayed }) {
    const updated = repository.updateParticipantWheelById(
      participantId,
      Boolean(wheelPlayed)
    );
    if (!updated) {
      throw new DomainError(404, 'Participant not found');
    }
    return updated;
  }

  function updateParticipantRole({ participantId, role, requesterOauthId }) {
    assertValidRole(role);
    const result = repository.updateParticipantRole(
      participantId,
      role,
      requesterOauthId
    );
    if (result.error) {
      throw new DomainError(result.status, result.error.message);
    }
    return result.data;
  }

  async function assignSecretSanta({
    assignments,
    preserveUnchangedWheel = false,
    sendNotifications = true,
    appUrl,
  }) {
    const validated = validateSecretSantaAssignments(assignments);
    const result = repository.assignSecretSanta(validated, {
      preserveUnchangedWheel: Boolean(preserveUnchangedWheel),
    });

    if (result.error) {
      throw new DomainError(result.status, result.error.message);
    }

    const emailEnabled = repository.isEmailFeatureEnabled();
    let notifyInfo = {
      notifiedCount: 0,
      emailMode: !emailEnabled
        ? 'disabled'
        : mailer.isSmtpConfigured()
          ? 'smtp'
          : 'local-outbox',
    };

    if (sendNotifications && emailEnabled && result.data.changedIds.length > 0) {
      notifyInfo = await notifyTargets({
        participantIds: result.data.changedIds,
        isReassignment: Boolean(preserveUnchangedWheel),
        appUrl,
      });
    }

    return { ok: true, ...notifyInfo };
  }

  async function notifyDraw({ participantId, isReassignment = false, appUrl }) {
    const targetIds = participantId ? [String(participantId)] : null;
    const notifyInfo = await notifyTargets({
      participantIds: targetIds,
      isReassignment: Boolean(isReassignment),
      appUrl,
    });
    return { ok: true, ...notifyInfo };
  }

  return {
    listParticipants,
    getParticipantByOauthId,
    saveParticipant,
    setParticipantReady,
    updateOwnWheelStatus,
    adminUpdateWheelStatus,
    updateParticipantRole,
    assignSecretSanta,
    notifyDraw,
  };
}

module.exports = {
  createParticipantUseCases,
};
