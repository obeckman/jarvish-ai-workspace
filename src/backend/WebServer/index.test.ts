import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Server } from 'node:http';

const mocks = vi.hoisted(() => ({
  authenticateRequest: vi.fn(),
}));

vi.mock('@/backend/auth/app-auth', () => ({
  authenticateRequest: mocks.authenticateRequest,
}));

import { runWebServer } from '@/backend/WebServer';

describe('runWebServer', () => {
  let server: Server | null = null;

  afterEach(async () => {
    await new Promise<void>((resolve, reject) => {
      if (!server) {
        resolve();
        return;
      }
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
    server = null;
    mocks.authenticateRequest.mockReset();
  });

  it('serves health and config endpoints', async () => {
    process.env.GOOGLE_CLIENT_ID = 'google-client';
    const app = runWebServer();
    const baseUrl = await listen(app);

    await expect(fetch(`${baseUrl}/api/health`).then((response) => response.json()))
      .resolves.toEqual({ status: 'ok' });
    await expect(fetch(`${baseUrl}/api/config`).then((response) => response.json()))
      .resolves.toEqual({ googleClientId: 'google-client' });
  });

  it('rejects unauthenticated GraphQL requests', async () => {
    const { GraphQLError } = await import('graphql');
    mocks.authenticateRequest.mockRejectedValue(new GraphQLError('Missing Authorization bearer token', {
      extensions: { code: 'UNAUTHENTICATED' },
    }));

    const app = runWebServer();
    const baseUrl = await listen(app);
    const response = await fetch(`${baseUrl}/graphql`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: '{ status }' }),
    });

    const body = await response.json();
    expect(body.errors?.[0]).toMatchObject({
      message: 'Missing Authorization bearer token',
      extensions: { code: 'UNAUTHENTICATED' },
    });
  });

  it('mounts the authenticated GraphQL endpoint', async () => {
    mocks.authenticateRequest.mockResolvedValue({ userId: 'user-1' });

    const app = runWebServer();
    const baseUrl = await listen(app);
    const response = await fetch(`${baseUrl}/graphql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer id-token',
      },
      body: JSON.stringify({ query: '{ status }' }),
    });

    await expect(response.json()).resolves.toEqual({
      data: {
        status: 'Backend graphQL is healthy',
      },
    });
  });

  function listen(app: ReturnType<typeof runWebServer>): Promise<string> {
    return new Promise((resolve) => {
      server = app.listen(0, () => {
        const address = server?.address();
        if (address && typeof address === 'object') {
          resolve(`http://127.0.0.1:${address.port}`);
        }
      });
    });
  }
});
