import type { AuthenticatedUser } from '@/backend/auth/app-auth';

export type GraphQLContext = {
  request: Request;
  auth: AuthenticatedUser;
};
