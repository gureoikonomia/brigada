import { timingSafeEqual } from 'node:crypto';

export const SESSION_COOKIE_NAME = 'brigada_session';
export const CSRF_COOKIE_NAME = 'brigada_csrf';

export function sessionVersionMatches(tokenVersion, storedVersion = 0) {
  return Number.isInteger(tokenVersion) && tokenVersion === storedVersion;
}

export function cookieOptions(isProduction) {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    path: '/api',
  };
}

export function csrfTokenMatches(cookieToken, headerToken) {
  if (typeof cookieToken !== 'string' || typeof headerToken !== 'string') {
    return false;
  }

  const cookieBuffer = Buffer.from(cookieToken);
  const headerBuffer = Buffer.from(headerToken);

  return cookieBuffer.length === headerBuffer.length
    && cookieBuffer.length > 0
    && timingSafeEqual(cookieBuffer, headerBuffer);
}

export function votedIncidentVisibilityMatch(userId, role) {
  if (['admin', 'moderator'].includes(role)) return null;

  return {
    $or: [
      { 'incident.status': { $in: ['pendiente', 'resuelta'] } },
      { 'incident.createdBy': userId },
    ],
  };
}
