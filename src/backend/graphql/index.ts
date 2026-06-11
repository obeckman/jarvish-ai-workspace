import { createYoga } from 'graphql-yoga';
import { authenticateRequest } from '@/backend/auth/app-auth';
import { schema } from '@/backend/graphql/schema';
import { logger } from '@/backend/utils/logger';


export const handleGraphQLRequests = () => {
// 3. Configure GraphQL Yoga
  // We will use Server-Sent Events (SSE) for subscriptions
  const yoga = createYoga({
    schema,
    context: async ({ request }) => {
      try {
        return {
          request,
          auth: await authenticateRequest(request),
        };
      } catch (error) {
        logger.warn({
          method: request.method,
          url: request.url,
          error,
        }, 'GraphQL request authentication failed');
        throw error;
      }
    },
    graphiql: process.env.NODE_ENV !== 'production',
    maskedErrors: false,
  });
  return yoga;
}
