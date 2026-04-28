import express from 'express';
import { createYoga } from 'graphql-yoga';
import { schema } from '@/server_v2/graphql/schema';
import { resolvers } from '@/server_v2/graphql/resolvers';
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

  // 2. Legacy Support Endpoints
  app.get('/api/config', (req, res) => {
    res.json({
      googleClientId: process.env.GOOGLE_CLIENT_ID || ''
    });
  });

  // 3. Configure GraphQL Yoga
  const yoga = createYoga({
    schema,
    // We use Server-Sent Events (SSE) for subscriptions in 2026
    graphiql: true, // Enable the playground for debugging
  });

  // 4. Bind Yoga to the /graphql endpoint
  app.use('/graphql', yoga);

  return app;
}
