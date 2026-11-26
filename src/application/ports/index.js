'use strict';

/**
 * Hexagonal Ports (Contracts)
 *
 * - ExchangeRepositoryPort (outbound persistence adapter, e.g. SQLite)
 *   - signUp, confirmEmail, createConfirmationTokenForEmail, signIn, getSession, getUserByToken, signOut
 *   - getParticipantsExcept, getAllParticipants, getParticipantByOauthId, saveParticipant
 *   - updateParticipantReady, updateParticipantRole, updateParticipantWheelByOauthId, updateParticipantWheelById
 *   - assignSecretSanta, getNotificationTargets
 *   - getGiftsByParticipantId, getAllGifts, saveGift, updateGift
 *   - getInfoEvent, isEmailFeatureEnabled, updateInfoEvent
 *
 * - MailerPort (outbound notification adapter, e.g. SMTP / local outbox)
 *   - isSmtpConfigured()
 *   - sendConfirmationEmail({ to, username, confirmUrl, eventConfig })
 *   - sendSecretSantaNotification({ to, participantName, friendName, appUrl, eventConfig, isReassignment })
 *
 * - CryptoPort (outbound security adapter, e.g. AES-256-GCM + scrypt + SHA-256)
 *   - isEncrypted, encrypt, decrypt, blindIndex, hashToken, hashPassword, verifyPassword
 */

module.exports = {};
