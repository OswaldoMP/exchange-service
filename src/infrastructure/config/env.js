'use strict';

const fs = require('node:fs');
const path = require('node:path');

function loadDotEnv(envPath) {
  const target = envPath || path.join(__dirname, '..', '..', '..', '.env');
  if (!fs.existsSync(target)) {
    return;
  }
  const content = fs.readFileSync(target, 'utf8');
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }
    const eqIdx = line.indexOf('=');
    if (eqIdx === -1) {
      continue;
    }
    const key = line.slice(0, eqIdx).trim();
    let val = line.slice(eqIdx + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = val;
    }
  }
}

function getConfig() {
  const rootDir = path.join(__dirname, '..', '..', '..');
  const dbPath =
    process.env.DB_PATH || path.join(rootDir, 'data', 'exchange-2026.sqlite');
  const corsRaw = String(process.env.CORS_ORIGINS || '*').trim();
  const corsOrigins =
    corsRaw === '*'
      ? '*'
      : corsRaw
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean);

  const hasAdminEnv = Boolean(
    process.env.ADMIN_EMAIL &&
      process.env.ADMIN_EMAIL.trim() &&
      process.env.ADMIN_PASSWORD &&
      process.env.ADMIN_PASSWORD.trim()
  );

  return {
    port: Number(process.env.PORT || 3000),
    host: process.env.HOST || '0.0.0.0',
    appUrl: (process.env.APP_URL || 'http://localhost:4200').replace(/\/$/, ''),
    dbPath,
    outboxDir: path.join(path.dirname(dbPath), 'outbox'),
    corsOrigins,
    admin: hasAdminEnv
      ? {
          email: process.env.ADMIN_EMAIL.trim(),
          password: process.env.ADMIN_PASSWORD,
          username: (process.env.ADMIN_NAME || 'Administrador').trim(),
        }
      : null,
    emailEnabledDefault:
      String(process.env.EMAIL_ENABLED ?? 'false').toLowerCase() === 'true',
  };
}

module.exports = {
  loadDotEnv,
  getConfig,
};
