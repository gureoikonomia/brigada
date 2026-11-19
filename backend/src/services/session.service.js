import { createHash, randomBytes, randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';

import { ServiceError } from '../errors/service.error.js';
import Session from '../models/session.model.js';
import User from '../models/user.model.js';
import { parseDurationMs } from '../utils/duration.js';

const ABSOLUTE_SESSION_TTL_MS = 90 * 24 * 60 * 60 * 1000;
const REFRESH_REUSE_GRACE_MS = 10 * 1000;

function getAccessTokenLifetime() {
  const expiresIn = process.env.JWT_EXPIRES_IN || '30m';
  return { expiresIn, maxAge: parseDurationMs(expiresIn) };
}

function getRefreshTokenLifetime() {
  const ttl = process.env.REFRESH_TTL || '30d';
  return { ttl, maxAge: parseDurationMs(ttl) };
}

function hashRefreshToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

function isSessionClaims(decoded) {
  return Boolean(
    decoded &&
    typeof decoded === 'object' &&
    typeof decoded.id === 'string' &&
    typeof decoded.jti === 'string' &&
    Number.isInteger(decoded.tokenVersion),
  );
}

function createAccessToken(user, sessionId, tokenVersion) {
  const { expiresIn } = getAccessTokenLifetime();
  return jwt.sign(
    {
      id: user._id.toString(),
      role: user.role,
      tokenVersion,
      accessTokenId: randomUUID(),
    },
    process.env.JWT_SECRET,
    {
      algorithm: 'HS256',
      expiresIn,
      jwtid: sessionId,
    },
  );
}

function invalidSession() {
  return new ServiceError('La sesión no es válida o ha caducado', 401, 'SESSION_INVALID');
}

function boundedUserAgent(userAgent) {
  return typeof userAgent === 'string' ? userAgent.slice(0, 512) : null;
}

async function getValidSessionUser(session, now) {
  if (
    !session ||
    !session.refreshExpiresAt ||
    !session.absoluteExpiresAt ||
    session.refreshExpiresAt <= now ||
    session.absoluteExpiresAt <= now
  ) {
    if (session?.sessionId) await Session.deleteOne({ sessionId: session.sessionId });
    throw invalidSession();
  }

  const user = await User.findById(session.userId).select('_id role isActive +tokenVersion');
  if (!user || !user.isActive || session.tokenVersion !== (user.tokenVersion || 0)) {
    await Session.deleteOne({ sessionId: session.sessionId });
    throw invalidSession();
  }

  return user;
}

function refreshExpiresAt(now, absoluteExpiresAt, refreshTtlMs) {
  return new Date(Math.min(now.getTime() + refreshTtlMs, absoluteExpiresAt.getTime()));
}

function createRefreshResult(user, sessionId, tokenVersion, refreshToken) {
  const accessToken = createAccessToken(user, sessionId, tokenVersion);
  return {
    accessToken,
    refreshToken,
    accessMaxAge: getAccessTokenLifetime().maxAge,
    refreshMaxAge: getRefreshTokenLifetime().maxAge,
  };
}

export async function createSession(user, userAgent) {
  const sessionId = randomUUID();
  const now = new Date();
  const tokenVersion = user.tokenVersion || 0;
  const { maxAge: accessMaxAge } = getAccessTokenLifetime();
  const { maxAge: refreshMaxAge } = getRefreshTokenLifetime();
  const absoluteExpiresAt = new Date(now.getTime() + ABSOLUTE_SESSION_TTL_MS);
  const refreshExpiry = refreshExpiresAt(now, absoluteExpiresAt, refreshMaxAge);
  const refreshToken = randomBytes(32).toString('base64url');
  const accessToken = createAccessToken(user, sessionId, tokenVersion);

  await Session.create({
    sessionId,
    userId: user._id,
    tokenVersion,
    refreshTokenHash: hashRefreshToken(refreshToken),
    previousRefreshTokenHash: null,
    rotatedAt: null,
    refreshExpiresAt: refreshExpiry,
    absoluteExpiresAt,
    lastUsedAt: now,
    userAgent: boundedUserAgent(userAgent),
  });

  return { accessToken, refreshToken, accessMaxAge, refreshMaxAge };
}

export async function refreshSessionToken(rawRefreshToken, userAgent) {
  if (typeof rawRefreshToken !== 'string' || !rawRefreshToken) throw invalidSession();

  const presentedHash = hashRefreshToken(rawRefreshToken);
  let session = await Session.findOne({ refreshTokenHash: presentedHash });
  let isPreviousToken = false;
  if (!session) {
    session = await Session.findOne({ previousRefreshTokenHash: presentedHash });
    isPreviousToken = Boolean(session);
  }
  if (!session) throw invalidSession();

  const now = new Date();
  const user = await getValidSessionUser(session, now);

  if (isPreviousToken) {
    const rotatedAt = session.rotatedAt?.getTime();
    if (!rotatedAt || now.getTime() - rotatedAt > REFRESH_REUSE_GRACE_MS) {
      await Session.deleteOne({ sessionId: session.sessionId });
      throw invalidSession();
    }

    const acceptedSession = await Session.findOneAndUpdate(
      {
        sessionId: session.sessionId,
        previousRefreshTokenHash: presentedHash,
        rotatedAt: session.rotatedAt,
        absoluteExpiresAt: { $gt: now },
      },
      { $set: { lastUsedAt: now, userAgent: boundedUserAgent(userAgent) } },
      { returnDocument: 'after' },
    );
    if (!acceptedSession) throw invalidSession();

    return createRefreshResult(user, acceptedSession.sessionId, acceptedSession.tokenVersion, null);
  }

  const refreshToken = randomBytes(32).toString('base64url');
  const { maxAge: refreshMaxAge } = getRefreshTokenLifetime();
  const rotatedSession = await Session.findOneAndUpdate(
    {
      sessionId: session.sessionId,
      refreshTokenHash: presentedHash,
      refreshExpiresAt: { $gt: now },
      absoluteExpiresAt: { $gt: now },
    },
    {
      $set: {
        refreshTokenHash: hashRefreshToken(refreshToken),
        previousRefreshTokenHash: presentedHash,
        rotatedAt: now,
        refreshExpiresAt: refreshExpiresAt(now, session.absoluteExpiresAt, refreshMaxAge),
        lastUsedAt: now,
        userAgent: boundedUserAgent(userAgent),
      },
    },
    { returnDocument: 'after' },
  );

  if (!rotatedSession) {
    return refreshSessionToken(rawRefreshToken, userAgent);
  }

  return createRefreshResult(
    user,
    rotatedSession.sessionId,
    rotatedSession.tokenVersion,
    refreshToken,
  );
}

export async function isSessionActive(decoded) {
  if (!isSessionClaims(decoded)) return false;

  const now = new Date();
  const session = await Session.exists({
    sessionId: decoded.jti,
    userId: decoded.id,
    tokenVersion: decoded.tokenVersion,
    refreshExpiresAt: { $gt: now },
    absoluteExpiresAt: { $gt: now },
  });

  return Boolean(session);
}

export async function revokeSessionToken(accessToken, refreshToken) {
  if (typeof accessToken === 'string' && accessToken) {
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET debe estar configurado para revocar sesiones');
    }

    let decoded;
    try {
      decoded = jwt.verify(accessToken, process.env.JWT_SECRET, {
        algorithms: ['HS256'],
        ignoreExpiration: true,
      });
    } catch (error) {
      if (!(error instanceof jwt.JsonWebTokenError)) throw error;
    }

    if (isSessionClaims(decoded)) {
      await Session.deleteOne({
        sessionId: decoded.jti,
        userId: decoded.id,
        tokenVersion: decoded.tokenVersion,
      });
      return true;
    }
  }

  if (typeof refreshToken !== 'string' || !refreshToken) return false;

  const refreshHash = hashRefreshToken(refreshToken);
  const result = await Session.deleteOne({
    $or: [{ refreshTokenHash: refreshHash }, { previousRefreshTokenHash: refreshHash }],
  });
  return result.deletedCount > 0;
}

export { getAccessTokenLifetime, getRefreshTokenLifetime };
