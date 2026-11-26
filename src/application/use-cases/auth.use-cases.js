'use strict';

function createAuthUseCases({ repository, mailer }) {
  async function signUp({ email, password, username, appUrl }) {
    const result = repository.signUp(email, password, username);
    if (result.error) {
      return { status: 400, payload: { data: result.data, error: result.error } };
    }

    let emailSent = false;
    let confirmationPreviewUrl;
    const emailEnabled = repository.isEmailFeatureEnabled();

    if (emailEnabled && result.data.requiresConfirmation && result.confirmationToken) {
      const confirmUrl = `${appUrl}/login?confirmToken=${encodeURIComponent(
        result.confirmationToken
      )}`;
      try {
        await mailer.sendConfirmationEmail({
          to: result.data.user.email,
          username: result.data.user.user_metadata.username,
          confirmUrl,
          eventConfig: repository.getInfoEvent(),
        });
        emailSent = true;
        if (!mailer.isSmtpConfigured()) {
          confirmationPreviewUrl = confirmUrl;
          console.log(`[exchange-service] Correo de confirmación (modo local) -> ${confirmUrl}`);
        }
      } catch (mailError) {
        console.error('[Mailer] Error sending confirmation email:', mailError.message);
      }
    }

    return {
      status: 201,
      payload: {
        data: {
          ...result.data,
          emailSent,
          emailMode: !emailEnabled
            ? 'disabled'
            : mailer.isSmtpConfigured()
              ? 'smtp'
              : 'local-outbox',
          ...(confirmationPreviewUrl ? { confirmationPreviewUrl } : {}),
        },
        error: null,
      },
    };
  }

  function confirmEmail({ token }) {
    const result = repository.confirmEmail(token);
    return {
      status: result.status,
      payload: { data: result.data, error: result.error },
    };
  }

  async function resendConfirmation({ email, appUrl }) {
    if (!repository.isEmailFeatureEnabled()) {
      return {
        status: 200,
        payload: {
          ok: false,
          emailMode: 'disabled',
          error: { message: 'El envío de correos está desactivado en la configuración.' },
        },
      };
    }

    const result = repository.createConfirmationTokenForEmail(email);
    if (result.error) {
      return { status: result.status, payload: { error: result.error } };
    }

    const confirmUrl = `${appUrl}/login?confirmToken=${encodeURIComponent(
      result.confirmationToken
    )}`;
    await mailer.sendConfirmationEmail({
      to: result.user.email,
      username: result.user.user_metadata.username,
      confirmUrl,
      eventConfig: repository.getInfoEvent(),
    });

    return {
      status: 200,
      payload: {
        ok: true,
        emailMode: mailer.isSmtpConfigured() ? 'smtp' : 'local-outbox',
        ...(!mailer.isSmtpConfigured() ? { confirmationPreviewUrl: confirmUrl } : {}),
      },
    };
  }

  function signIn({ email, password }) {
    const result = repository.signIn(email, password);
    const status = result.error
      ? result.error.message === 'Email not confirmed'
        ? 403
        : 401
      : 200;
    return { status, payload: result };
  }

  function signOut({ token }) {
    return { status: 200, payload: repository.signOut(token) };
  }

  function getSession({ token }) {
    return { status: 200, payload: repository.getSession(token) };
  }

  function getUserByToken({ token }) {
    return { status: 200, payload: repository.getUserByToken(token) };
  }

  return {
    signUp,
    confirmEmail,
    resendConfirmation,
    signIn,
    signOut,
    getSession,
    getUserByToken,
  };
}

module.exports = {
  createAuthUseCases,
};
