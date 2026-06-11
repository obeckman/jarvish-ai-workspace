import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  verifyIdToken: vi.fn(),
}));

vi.mock('google-auth-library', () => ({
  OAuth2Client: vi.fn(function OAuth2Client() {
    return {
      verifyIdToken: mocks.verifyIdToken,
    };
  }),
}));

describe('authenticateRequest', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv, GOOGLE_CLIENT_ID: 'client-id' };
    mocks.verifyIdToken.mockReset();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('rejects requests without a bearer token', async () => {
    const { authenticateRequest } = await import('@/backend/auth/app-auth');

    await expect(authenticateRequest(new Request('http://localhost/graphql'))).rejects.toMatchObject({
      extensions: { code: 'UNAUTHENTICATED' },
    });
    expect(mocks.verifyIdToken).not.toHaveBeenCalled();
  });

  it('verifies Google ID tokens and derives the Jarvish user id from sub', async () => {
    mocks.verifyIdToken.mockResolvedValue({
      getPayload: () => ({
        sub: 'google-sub-1',
        email: 'person@example.com',
        name: 'Person Example',
      }),
    });
    const { authenticateRequest } = await import('@/backend/auth/app-auth');

    await expect(authenticateRequest(new Request('http://localhost/graphql', {
      headers: { Authorization: 'Bearer id-token' },
    }))).resolves.toEqual({
      userId: 'google-sub-1',
      email: 'person@example.com',
      name: 'Person Example',
    });
    expect(mocks.verifyIdToken).toHaveBeenCalledWith({
      idToken: 'id-token',
      audience: 'client-id',
    });
  });
});
