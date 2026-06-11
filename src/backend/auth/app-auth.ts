import { GraphQLError } from 'graphql';
import { OAuth2Client } from 'google-auth-library';

export type AuthenticatedUser = {
  userId: string;
  email?: string;
  name?: string;
};

const oauthClient = new OAuth2Client();

export async function authenticateRequest(request: Request): Promise<AuthenticatedUser> {
  const token = getBearerToken(request.headers.get('authorization'));

  if (!token) {
    throw unauthenticatedError('Missing Authorization bearer token');
  }

  const audience = process.env.GOOGLE_CLIENT_ID?.trim();
  if (!audience) {
    throw unauthenticatedError('GOOGLE_CLIENT_ID is not configured');
  }

  try {
    const ticket = await oauthClient.verifyIdToken({
      idToken: token,
      audience,
    });
    const payload = ticket.getPayload();

    if (!payload?.sub) {
      throw new Error('Google ID token payload did not include a subject');
    }

    return {
      userId: payload.sub,
      email: payload.email,
      name: payload.name,
    };
  } catch (error) {
    throw unauthenticatedError(error instanceof Error ? error.message : 'Invalid Google ID token');
  }
}

function getBearerToken(authorizationHeader: string | null): string | null {
  if (!authorizationHeader) {
    return null;
  }

  const [scheme, token] = authorizationHeader.trim().split(/\s+/, 2);
  if (scheme?.toLowerCase() !== 'bearer' || !token) {
    return null;
  }

  return token;
}

function unauthenticatedError(message: string): GraphQLError {
  return new GraphQLError(message, {
    extensions: {
      code: 'UNAUTHENTICATED',
    },
  });
}
