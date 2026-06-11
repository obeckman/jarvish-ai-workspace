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
  const originalNodeEnv = process.env.NODE_ENV;
  const originalGraphqlPlaygroundEnabled = process.env.GRAPHQL_PLAYGROUND_ENABLED;
  const originalGraphqlJsonLimit = process.env.GRAPHQL_JSON_LIMIT;

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
    restoreEnv('NODE_ENV', originalNodeEnv);
    restoreEnv('GRAPHQL_PLAYGROUND_ENABLED', originalGraphqlPlaygroundEnabled);
    restoreEnv('GRAPHQL_JSON_LIMIT', originalGraphqlJsonLimit);
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

  it('does not apply JSON body parsing to legacy endpoints', async () => {
    process.env.GRAPHQL_JSON_LIMIT = '1kb';

    const app = runWebServer();
    const baseUrl = await listen(app);
    const response = await fetch(`${baseUrl}/api/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payload: 'x'.repeat(2048) }),
    });

    expect(response.status).toBe(404);
  });

  it('rejects oversized GraphQL JSON bodies before authentication', async () => {
    process.env.GRAPHQL_JSON_LIMIT = '1kb';

    const app = runWebServer();
    const baseUrl = await listen(app);
    const response = await fetch(`${baseUrl}/graphql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer id-token',
      },
      body: JSON.stringify({
        query: '{ status }',
        variables: { payload: 'x'.repeat(2048) },
      }),
    });

    expect(response.status).toBe(413);
    expect(mocks.authenticateRequest).not.toHaveBeenCalled();
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

  it('serves GraphiQL outside production', async () => {
    process.env.NODE_ENV = 'development';

    const app = runWebServer();
    const baseUrl = await listen(app);
    const response = await fetch(`${baseUrl}/graphql`, {
      headers: { Accept: 'text/html' },
    });

    await expect(response.text()).resolves.toContain('GraphiQL');
  });

  it('does not serve GraphiQL in production', async () => {
    process.env.NODE_ENV = 'production';
    process.env.GRAPHQL_PLAYGROUND_ENABLED = 'true';

    const app = runWebServer();
    const baseUrl = await listen(app);
    const response = await fetch(`${baseUrl}/graphql`, {
      headers: { Accept: 'text/html' },
    });

    await expect(response.text()).resolves.not.toContain('GraphiQL');
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

  function restoreEnv(key: string, value: string | undefined): void {
    if (value === undefined) {
      delete process.env[key];
      return;
    }
    process.env[key] = value;
  }
});
