/**
 * @vitest-environment jsdom
 */
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { STORAGE_KEYS } from '@/shared/jarvish.constants';

describe('useGoogleAuth', () => {
  beforeEach(() => {
    vi.resetModules();
    localStorage.clear();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('loads persisted token state and logs out cleanly', async () => {
    localStorage.setItem(STORAGE_KEYS.GOOGLE_TOKEN, 'token-1');
    localStorage.setItem(STORAGE_KEYS.GOOGLE_ID_TOKEN, createJwt(Date.now() + 10 * 60_000));
    localStorage.setItem('google_token_expires_at', String(Date.now() + 60_000));
    const { useGoogleAuth } = await import('@/frontend/features/jarvishAgent/hooks/useGoogleAuth');
    const { result } = renderHook(() => useGoogleAuth());

    expect(result.current.googleToken).toBe('token-1');
    expect(result.current.googleIdToken).toBeTruthy();

    act(() => {
      result.current.logout();
    });

    expect(result.current.googleToken).toBeNull();
    expect(result.current.googleIdToken).toBeNull();
    expect(localStorage.getItem(STORAGE_KEYS.GOOGLE_TOKEN)).toBeNull();
    expect(localStorage.getItem(STORAGE_KEYS.GOOGLE_ID_TOKEN)).toBeNull();
    expect(localStorage.getItem(STORAGE_KEYS.GOOGLE_ID_TOKEN_EXPIRES_AT)).toBeNull();
    expect(localStorage.getItem('google_token_expires_at')).toBeNull();
  });

  it('clears expired persisted Google ID tokens on load', async () => {
    localStorage.setItem(STORAGE_KEYS.GOOGLE_ID_TOKEN, createJwt(Date.now() - 60_000));
    const { useGoogleAuth } = await import('@/frontend/features/jarvishAgent/hooks/useGoogleAuth');
    const { result } = renderHook(() => useGoogleAuth());

    expect(result.current.googleIdToken).toBeNull();
    expect(localStorage.getItem(STORAGE_KEYS.GOOGLE_ID_TOKEN)).toBeNull();
  });

  it('rejects login when Google Identity Services are unavailable', async () => {
    const { useGoogleAuth } = await import('@/frontend/features/jarvishAgent/hooks/useGoogleAuth');
    const { result } = renderHook(() => useGoogleAuth());

    await act(async () => {
      await expect(result.current.loginWithGoogle()).rejects.toBe(
        'Failed to initialize Google Login: Google Identity Services are not loaded.',
      );
    });

    expect(result.current.authError).toBe('Failed to initialize Google Login: Google Identity Services are not loaded.');
  });

  it('returns the existing token when it is not near expiry', async () => {
    vi.setSystemTime(new Date('2026-06-10T10:00:00.000Z'));
    localStorage.setItem(STORAGE_KEYS.GOOGLE_TOKEN, 'valid-token');
    localStorage.setItem('google_token_expires_at', String(Date.now() + 10 * 60 * 1000));
    const { useGoogleAuth } = await import('@/frontend/features/jarvishAgent/hooks/useGoogleAuth');
    const { result } = renderHook(() => useGoogleAuth());

    await expect(result.current.checkAndRefreshToken()).resolves.toBe('valid-token');
    vi.useRealTimers();
  });
});

function createJwt(expiresAtMs: number): string {
  const header = btoa(JSON.stringify({ alg: 'none' }));
  const payload = btoa(JSON.stringify({ exp: Math.floor(expiresAtMs / 1000) }));
  return `${header}.${payload}.signature`;
}
