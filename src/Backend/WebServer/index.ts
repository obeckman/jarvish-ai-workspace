
import express, { Request, Response, Application } from 'express';
import cors from 'cors';
import {handleGraphQLRequests} from '@/Backend/graphql';
/**
 * Express Application Assembler
 * Configures the server with GraphQL Yoga and required middlewares.
 */
export function runWebServer() {
  const app = express();
  
  // 1. Basic Middlewares
  app.use(cors());
  app.use(express.json({ limit: '20mb' }));

  // 2. Legacy Support Endpoints
  app.get('/api/config', (req: Request, res: Response) => {
    res.json({
      googleClientId: process.env.GOOGLE_CLIENT_ID || ''
    });
  });


  // 4. Bind Yoga to the /graphql endpoint
  app.use('/graphql', handleGraphQLRequests());

  return app;
}
