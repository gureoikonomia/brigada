const DURATION_UNITS_MS = {
  s: 1000,
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000,
};

export function parseDurationMs(value) {
  const match = /^([1-9]\d*)(s|m|h|d)$/.exec(value);
  if (!match) {
    throw new Error('La duración debe usar segundos, minutos, horas o días (por ejemplo, 30m)');
  }

  const durationMs = Number(match[1]) * DURATION_UNITS_MS[match[2]];
  if (!Number.isSafeInteger(durationMs)) {
    throw new Error('La duración debe ser un entero seguro');
  }

  return durationMs;
}
