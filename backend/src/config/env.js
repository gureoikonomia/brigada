function parseHttpsOrigin(value, name) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${name} debe ser un origen HTTPS válido`);
  }

  if (url.protocol !== 'https:' || url.origin !== value) {
    throw new Error(`${name} debe ser un origen HTTPS sin ruta ni barra final`);
  }

  return url.origin;
}

export function getCorsOrigins() {
  const configuredOrigins = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (process.env.NODE_ENV !== 'production') {
    configuredOrigins.push('http://localhost:5173', 'http://127.0.0.1:5173');
  }

  return new Set(configuredOrigins);
}

export function validateJwtExpiry(value = process.env.JWT_EXPIRES_IN || '1h') {
  const match = /^([1-9]\d*)(s|m|h|d)$/.exec(value);
  if (!match) {
    throw new Error('JWT_EXPIRES_IN debe usar segundos, minutos, horas o días (por ejemplo, 1h)');
  }

  const unitsInSeconds = { s: 1, m: 60, h: 3600, d: 86400 };
  const seconds = Number(match[1]) * unitsInSeconds[match[2]];
  if (!Number.isSafeInteger(seconds) || seconds > 86400) {
    throw new Error('JWT_EXPIRES_IN no puede superar 24 horas');
  }
}

export function validateEnvironment() {
  validateJwtExpiry();
  if (process.env.NODE_ENV !== 'production') return;

  if (
    process.env.TRUST_PROXY_HOPS !== undefined &&
    !/^\d+$/.test(process.env.TRUST_PROXY_HOPS)
  ) {
    throw new Error('TRUST_PROXY_HOPS debe ser un número entero no negativo');
  }
  if (Number(process.env.TRUST_PROXY_HOPS) < 1) {
    throw new Error('TRUST_PROXY_HOPS debe ser al menos 1 detrás del proxy de Render');
  }

  const requiredVariables = [
    'MONGODB_URI',
    'JWT_SECRET',
    'CLOUDINARY_CLOUD_NAME',
    'CLOUDINARY_API_KEY',
    'CLOUDINARY_API_SECRET',
    'RESEND_API_KEY',
    'RESEND_FROM',
    'FRONTEND_URL',
    'CORS_ORIGINS',
    'PRIVACY_NOTICE_URL',
    'PRIVACY_NOTICE_VERSION',
    'TRUST_PROXY_HOPS',
  ];
  const missingVariables = requiredVariables.filter(
    (name) => !process.env[name]?.trim()
  );

  if (missingVariables.length) {
    throw new Error(`Faltan variables de producción: ${missingVariables.join(', ')}`);
  }

  if (process.env.JWT_SECRET.length < 32 || /cambia-|change-me|your-secret/i.test(process.env.JWT_SECRET)) {
    throw new Error('JWT_SECRET debe ser un secreto aleatorio de al menos 32 caracteres');
  }

  const mongoUsesTls = process.env.MONGODB_URI.startsWith('mongodb+srv://')
    ? !/[?&](tls|ssl)=false(?:&|$)/i.test(process.env.MONGODB_URI)
    : /[?&](tls|ssl)=true(?:&|$)/i.test(process.env.MONGODB_URI);
  if (!mongoUsesTls) {
    throw new Error('MONGODB_URI debe usar TLS en producción');
  }

  const frontendOrigin = parseHttpsOrigin(process.env.FRONTEND_URL, 'FRONTEND_URL');
  let privacyNoticeUrl;
  try {
    privacyNoticeUrl = new URL(process.env.PRIVACY_NOTICE_URL);
  } catch {
    throw new Error('PRIVACY_NOTICE_URL debe ser una URL HTTPS válida');
  }
  if (
    privacyNoticeUrl.protocol !== 'https:' ||
    !process.env.PRIVACY_NOTICE_VERSION.trim()
  ) {
    throw new Error('PRIVACY_NOTICE_URL y PRIVACY_NOTICE_VERSION deben estar configuradas correctamente');
  }

  const allowedOrigins = process.env.CORS_ORIGINS.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
    .map((origin) => parseHttpsOrigin(origin, 'CORS_ORIGINS'));

  if (!allowedOrigins.includes(frontendOrigin)) {
    throw new Error('CORS_ORIGINS debe incluir el origen configurado en FRONTEND_URL');
  }
}
