export function getEmailConfiguration(env = process.env) {
  const user = env.GMAIL_USER?.trim();
  const password = env.GMAIL_APP_PASSWORD?.replace(/\s/g, '');
  if (!user || !password) {
    throw new Error('GMAIL_USER y GMAIL_APP_PASSWORD son obligatorias para el envío de correo');
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user)) {
    throw new Error('GMAIL_USER debe ser una dirección de correo válida');
  }
  return { user, password };
}
