import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { bootstrap } = require('../src/index.js');
const { createSmtpMailerAdapter } = require('../src/infrastructure/mail/smtp-mailer.adapter.js');

describe('exchange-service (Express + SQLite + Hexagonal)', () => {
  let ctx;
  let server;
  let baseUrl;
  let mailer;

  async function signInAsAdmin() {
    const res = await fetch(`${baseUrl}/api/auth/signin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: ctx.config.admin.email,
        password: ctx.config.admin.password,
      }),
    });
    assert.equal(res.status, 200);
    return res.json();
  }

  async function registerUser(email, password, username) {
    const res = await fetch(`${baseUrl}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, username }),
    });
    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.error, null);
    assert.ok(body.data.session.access_token);
    return body;
  }

  beforeEach(async () => {
    mailer = createSmtpMailerAdapter({ outboxDir: null, smtpHost: '' });
    ctx = bootstrap({
      dbPath: ':memory:',
      mailer,
      emailEnabledDefault: false,
      admin: {
        email: 'admin.prod@intercambio2026.local',
        password: 'ProdSecretPassword2026!',
        username: 'Super Admin',
      },
    });
    server = await new Promise((resolve) => {
      const s = ctx.app.listen(0, '127.0.0.1', () => resolve(s));
    });
    const { port } = server.address();
    baseUrl = `http://127.0.0.1:${port}`;
  });

  afterEach(async () => {
    await new Promise((resolve) => server.close(resolve));
    ctx.repository.close();
  });

  it('returns health status and default 2026 exchange config (email flag disabled by default)', async () => {
    const healthRes = await fetch(`${baseUrl}/api/health`);
    assert.equal(healthRes.status, 200);
    const health = await healthRes.json();
    assert.equal(health.status, 'ok');
    assert.equal(health.service, 'exchange-service');

    const eventRes = await fetch(`${baseUrl}/api/exchanges/current`);
    assert.equal(eventRes.status, 200);
    const event = await eventRes.json();
    assert.equal(event.event_title, 'Intercambio 2026');
    assert.equal(event.email_notifications_enabled, false);
  });

  it('encrypts sensitive data at rest and supports email confirmation + notifications when flag is enabled', async () => {
    const adminLogin = await signInAsAdmin();
    const adminToken = adminLogin.data.session.access_token;

    // Enable email feature flag
    const enableRes = await fetch(`${baseUrl}/api/exchanges/current`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ email_notifications_enabled: true }),
    });
    assert.equal(enableRes.status, 200);

    // Signup requires confirmation
    const signUpRes = await fetch(`${baseUrl}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'elena@navidad2026.com',
        password: 'SuperSecretPassword!',
        username: 'Elena Privada',
      }),
    });
    assert.equal(signUpRes.status, 201);
    const signUpBody = await signUpRes.json();
    assert.equal(signUpBody.data.requiresConfirmation, true);
    assert.equal(mailer.sentLog.length, 1);

    // Blocked login before confirmation
    const blocked = await fetch(`${baseUrl}/api/auth/signin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'elena@navidad2026.com',
        password: 'SuperSecretPassword!',
      }),
    });
    assert.equal(blocked.status, 403);

    // Confirm email
    const token = new URL(signUpBody.data.confirmationPreviewUrl).searchParams.get(
      'confirmToken'
    );
    const confirmRes = await fetch(`${baseUrl}/api/auth/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    assert.equal(confirmRes.status, 200);
    const confirmBody = await confirmRes.json();
    const rawSessionToken = confirmBody.data.session.access_token;
    assert.ok(rawSessionToken);

    // Assign secret santa -> sends notifications
    const all = await (await fetch(`${baseUrl}/api/participants`)).json();
    const [p1, p2] = all;
    const assignRes = await fetch(`${baseUrl}/api/participants/assign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        assignments: [
          { id: p1.id, friend_id: p2.id },
          { id: p2.id, friend_id: p1.id },
        ],
      }),
    });
    assert.equal(assignRes.status, 200);
    assert.equal((await assignRes.json()).notifiedCount, 2);

    // Audit SQLite raw rows for AES-256-GCM encryption & SHA-256 session hashing
    const rawUsers = ctx.repository.rawDb
      .prepare('SELECT email, username, password_hash FROM users')
      .all();
    for (const row of rawUsers) {
      assert.ok(row.email.startsWith('enc:v1:'));
      assert.ok(!row.email.includes('@'));
      assert.ok(row.username.startsWith('enc:v1:'));
      assert.ok(!row.password_hash.includes('SuperSecretPassword!'));
    }

    const rawSessions = ctx.repository.rawDb.prepare('SELECT token FROM sessions').all();
    for (const row of rawSessions) {
      assert.notEqual(row.token, rawSessionToken);
      assert.match(row.token, /^[0-9a-f]{64}$/);
    }

    const rawParticipants = ctx.repository.rawDb
      .prepare('SELECT name, friend_id, friend_id_enc FROM participants')
      .all();
    for (const row of rawParticipants) {
      assert.ok(row.name.startsWith('enc:v1:'));
      assert.equal(row.friend_id, null);
      assert.ok(row.friend_id_enc.startsWith('enc:v1:'));
    }
  });

  it('supports roles, wheel status, gifts CRUD, validation rules, and default no-email flow', async () => {
    const lauraAuth = await registerUser(
      'laura@navidad2026.com',
      'Password123!',
      'Laura Gómez'
    );
    const lauraToken = lauraAuth.data.session.access_token;
    const lauraOauthId = lauraAuth.data.user.id;
    assert.equal(mailer.sentLog.length, 0);

    const laura = await (
      await fetch(`${baseUrl}/api/participants/by-oauth/${encodeURIComponent(lauraOauthId)}`)
    ).json();
    assert.equal(laura.role, 'participant');

    // Gifts CRUD
    const giftRes = await fetch(`${baseUrl}/api/gifts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        participant_id: laura.id,
        title: 'Cafetera',
        store: 'Liverpool',
        link: 'https://example.com/cafetera',
      }),
    });
    assert.equal(giftRes.status, 201);
    const gift = await giftRes.json();

    const updateGiftRes = await fetch(`${baseUrl}/api/gifts/${gift.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Cafetera Pro',
        store: 'Liverpool',
        link: 'https://example.com/cafetera',
        removed: 0,
      }),
    });
    assert.equal(updateGiftRes.status, 200);

    // Wheel status update by owner + reset by admin
    const selfWheel = await fetch(
      `${baseUrl}/api/participants/by-oauth/${encodeURIComponent(lauraOauthId)}/wheel`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${lauraToken}`,
        },
        body: JSON.stringify({ wheel_played: true }),
      }
    );
    assert.equal(selfWheel.status, 200);
    assert.equal((await selfWheel.json()).wheel_played, true);

    const adminLogin = await signInAsAdmin();
    const adminToken = adminLogin.data.session.access_token;

    const resetWheel = await fetch(`${baseUrl}/api/participants/${laura.id}/wheel`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ wheel_played: false }),
    });
    assert.equal(resetWheel.status, 200);
    assert.equal((await resetWheel.json()).wheel_played, false);

    // Promote and demote role
    const promote = await fetch(`${baseUrl}/api/participants/${laura.id}/role`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ role: 'admin' }),
    });
    assert.equal(promote.status, 200);
    assert.equal((await promote.json()).role, 'admin');

    // Invalid self-assignment rejected with 400
    const badAssign = await fetch(`${baseUrl}/api/participants/assign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        assignments: [
          { id: laura.id, friend_id: laura.id },
          { id: '1', friend_id: '1' },
        ],
      }),
    });
    assert.equal(badAssign.status, 400);
  });

  it('starts with a completely clean database (0 users) when ADMIN_EMAIL and ADMIN_PASSWORD are not set', () => {
    const cleanCtx = bootstrap({
      dbPath: ':memory:',
      admin: null,
      emailEnabledDefault: false,
    });
    try {
      assert.equal(cleanCtx.repository.getAllParticipants().length, 0);
      assert.equal(cleanCtx.repository.getInfoEvent().event_title, 'Intercambio 2026');
    } finally {
      cleanCtx.repository.close();
    }
  });
});
