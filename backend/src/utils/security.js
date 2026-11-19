import { timingSafeEqual } from 'node:crypto';

export const SESSION_COOKIE_NAME = 'brigada_session';
export const REFRESH_COOKIE_NAME = 'brigada_refresh';
export const CSRF_COOKIE_NAME = 'brigada_csrf';
export const REFRESH_COOKIE_PATH = '/api/auth';

export function sessionVersionMatches(tokenVersion, storedVersion = 0) {
  return Number.isInteger(tokenVersion) && tokenVersion === storedVersion;
}

export function cookieOptions(isProduction, maxAge) {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    path: '/api',
    ...(maxAge === undefined ? {} : { maxAge }),
  };
}

export function refreshCookieOptions(isProduction, maxAge) {
  return {
    ...cookieOptions(isProduction),
    path: REFRESH_COOKIE_PATH,
    ...(maxAge === undefined ? {} : { maxAge }),
  };
}

export function clearAuthCookies(res, isProduction) {
  res.clearCookie(SESSION_COOKIE_NAME, cookieOptions(isProduction));
  res.clearCookie(REFRESH_COOKIE_NAME, refreshCookieOptions(isProduction));
  res.clearCookie(CSRF_COOKIE_NAME, cookieOptions(isProduction));
}

export function csrfTokenMatches(cookieToken, headerToken) {
  if (typeof cookieToken !== 'string' || typeof headerToken !== 'string') {
    return false;
  }

  const cookieBuffer = Buffer.from(cookieToken);
  const headerBuffer = Buffer.from(headerToken);

  return (
    cookieBuffer.length === headerBuffer.length &&
    cookieBuffer.length > 0 &&
    timingSafeEqual(cookieBuffer, headerBuffer)
  );
}

export function bearerTokenMatches(authorizationHeader, expectedToken) {
  if (
    typeof authorizationHeader !== 'string' ||
    typeof expectedToken !== 'string' ||
    !expectedToken
  ) {
    return false;
  }

  const [scheme, token, ...extraParts] = authorizationHeader.trim().split(/\s+/);
  if (scheme !== 'Bearer' || !token || extraParts.length > 0) return false;

  const expectedBuffer = Buffer.from(expectedToken);
  const tokenBuffer = Buffer.from(token);
  return (
    expectedBuffer.length > 0 &&
    expectedBuffer.length === tokenBuffer.length &&
    timingSafeEqual(expectedBuffer, tokenBuffer)
  );
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
