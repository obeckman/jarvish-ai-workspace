// Shared between the Express demo routes and the HidingLag frontend demo.

export type ProfileStatus = 'active' | 'suspended' | 'pending';

export type DbNode = 'primary' | 'replica' | 'optimisticUpdate';

export interface UserProfile {
  id: string;
  name: string;
  status: ProfileStatus;
  updatedAt: string;
}

export interface ProfileResponse {
  profile: UserProfile;
  // Which simulated database answered the read, so the UI can show it.
  servedBy: DbNode;
}

export const HIDING_LAG_ROUTES = {
  PROFILE: '/api/hiding-lag/profile',
} as const;

export const HIDING_LAG_HEADERS = {
  FORCE_PRIMARY: 'x-force-primary',
} as const;
