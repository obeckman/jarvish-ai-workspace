import { afterEach, describe, expect, it } from 'vitest';

import { getCorsOptions } from '@/backend/WebServer/cors';

describe('getCorsOptions', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('allows configured CORS origins', async () => {
    process.env.CORS_ORIGINS = 'https://jarvish.example,http://localhost:5173';
    const options = getCorsOptions();

    await expect(expectOrigin(options.origin, 'https://jarvish.example')).resolves.toBe(true);
    await expect(expectOrigin(options.origin, 'http://localhost:5173')).resolves.toBe(true);
  });

  it('rejects unconfigured browser origins and allows non-browser requests', async () => {
    process.env.CORS_ORIGINS = 'https://jarvish.example';
    const options = getCorsOptions();

    await expect(expectOrigin(options.origin, 'https://attacker.example')).resolves.toBe(false);
    await expect(expectOrigin(options.origin, undefined)).resolves.toBe(true);
  });
});

function expectOrigin(originHandler: unknown, origin: string | undefined): Promise<boolean> {
  return new Promise((resolve, reject) => {
    if (typeof originHandler !== 'function') {
      reject(new Error('CORS origin handler was not a function'));
      return;
    }

    originHandler(origin, (error: Error | null, allowed?: boolean) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(Boolean(allowed));
    });
  });
}
