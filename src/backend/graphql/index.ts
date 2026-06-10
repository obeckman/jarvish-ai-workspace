import { createYoga } from 'graphql-yoga';
import { schema } from '@/backend/graphql/schema';


export const handleGraphQLRequests = () => {
// 3. Configure GraphQL Yoga
  // We will use Server-Sent Events (SSE) for subscriptions
  const yoga = createYoga({
    schema,
    graphiql: true, // Enable the playground for debugging
  });
  return yoga;
}