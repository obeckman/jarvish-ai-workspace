import express from 'express';
import { createYoga } from 'graphql-yoga';
import { schema } from './graphql/schema.js';
import { resolvers } from './graphql/resolvers.js';
import cors from 'cors';

/**
 * Express Application Assembler
 * Configures the server with GraphQL Yoga and required middlewares.
 */
export function createApp() {
  const app = express();
  
  // 1. Basic Middlewares
  app.use(cors());
  app.use(express.json({ limit: '20mb' }));

  // 2. Configure GraphQL Yoga
  const yoga = createYoga({
    schema,
    resolvers,
    // We use Server-Sent Events (SSE) for subscriptions in 2026
    graphiql: true, // Enable the playground for debugging
  });

  // 3. Bind Yoga to the /graphql endpoint
  app.use('/graphql', yoga);

  return app;
}
