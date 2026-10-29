import {
  HIDING_LAG_HEADERS,
  HIDING_LAG_ROUTES,
  type ProfileResponse,
} from '@/shared/hidingLag.types';

async function parseResponse(res: Response): Promise<ProfileResponse> {
  if (!res.ok) {
    throw new Error(`Profile request failed with status ${res.status}`);
  }
  return res.json() as Promise<ProfileResponse>;
}

export async function fetchProfile(options: {
  forcePrimary: boolean;
  signal?: AbortSignal;
}): Promise<ProfileResponse> {
  const res = await fetch(HIDING_LAG_ROUTES.PROFILE, {
    signal: options.signal,
    headers: options.forcePrimary ? { [HIDING_LAG_HEADERS.FORCE_PRIMARY]: 'true' } : {},
  });
  return parseResponse(res);
}

export async function updateProfileName(name: string): Promise<ProfileResponse> {
  const res = await fetch(HIDING_LAG_ROUTES.PROFILE, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  return parseResponse(res);
}
