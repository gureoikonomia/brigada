import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';

import Session from '../models/session.model.js';

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';

function isSessionClaims(decoded) {
  return Boolean(
    decoded
    && typeof decoded === 'object'
    && typeof decoded.id === 'string'
    && typeof decoded.jti === 'string'
    && Number.isInteger(decoded.tokenVersion)
  );
}

export async function createSessionToken(user) {
  const sessionId = randomUUID();
  const tokenVersion = user.tokenVersion || 0;
  const token = jwt.sign(
    {
      id: user._id.toString(),
      role: user.role,
      tokenVersion,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: JWT_EXPIRES_IN,
      jwtid: sessionId,
    }
  );
  const decoded = jwt.decode(token);

  if (!decoded || typeof decoded !== 'object' || !Number.isInteger(decoded.exp)) {
    throw new Error('No se pudo determinar la expiración de la sesión');
  }

  await Session.create({
    sessionId,
    userId: user._id,
    tokenVersion,
    expiresAt: new Date(decoded.exp * 1000),
  });

  return token;
}

export async function isSessionActive(decoded) {
  if (!isSessionClaims(decoded)) return false;

  const session = await Session.exists({
    sessionId: decoded.jti,
    userId: decoded.id,
    tokenVersion: decoded.tokenVersion,
    expiresAt: { $gt: new Date() },
  });

  return Boolean(session);
}

export async function revokeSessionToken(token) {
  if (typeof token !== 'string' || !token) return false;
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET debe estar configurado para revocar sesiones');
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET, { ignoreExpiration: true });
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) return false;
    throw error;
  }

  if (!isSessionClaims(decoded)) return false;

  await Session.deleteOne({
    sessionId: decoded.jti,
    userId: decoded.id,
    tokenVersion: decoded.tokenVersion,
  });

  return true;
}
