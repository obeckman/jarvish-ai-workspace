import type { CorsOptions } from 'cors';

export function getCorsOptions(): CorsOptions {
  const allowedOrigins = getAllowedOrigins();

  return {
    origin(origin, callback) {
      if (!origin) {
        callback(null, true);
        return;
      }

      callback(null, allowedOrigins.has(origin));
    },
  };
}

function getAllowedOrigins(): Set<string> {
  const configuredOrigins = splitOrigins(process.env.CORS_ORIGINS);
  const devOrigin = process.env.VITE_DEV_ORIGIN?.trim();

  if (devOrigin) {
    configuredOrigins.push(devOrigin);
  }

  return new Set(configuredOrigins);
}

function splitOrigins(value: string | undefined): string[] {
  if (!value) {
    return [];
  }

  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}
