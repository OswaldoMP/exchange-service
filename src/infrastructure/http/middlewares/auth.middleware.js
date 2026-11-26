'use strict';

function extractBearerToken(req) {
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) {
    return header.slice(7).trim();
  }
  if (typeof req.query?.token === 'string') {
    return req.query.token.trim();
  }
  return '';
}

function createAuthMiddlewares({ repository }) {
  function requireAuth(req, res, next) {
    const token = extractBearerToken(req);
    const sessionRes = repository.getSession(token);
    const userId = sessionRes.data.session?.user?.id;
    if (!userId) {
      res.status(401).json({ error: { message: 'Unauthorized' } });
      return;
    }
    const requester = repository.getParticipantByOauthId(userId);
    req.auth = {
      token,
      userId,
      requester,
      isAdmin: Boolean(requester?.is_admin),
    };
    next();
  }

  function requireAdmin(req, res, next) {
    requireAuth(req, res, () => {
      if (!req.auth?.isAdmin) {
        res.status(403).json({ error: { message: 'Forbidden: admin required' } });
        return;
      }
      next();
    });
  }

  return {
    extractBearerToken,
    requireAuth,
    requireAdmin,
  };
}

module.exports = {
  extractBearerToken,
  createAuthMiddlewares,
};
