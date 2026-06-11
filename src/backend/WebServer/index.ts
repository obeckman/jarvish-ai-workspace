
import express, {
  NextFunction,
  Request,
  RequestHandler,
  Response,
} from 'express';
import cors from 'cors';
import {handleGraphQLRequests} from '@/backend/graphql';
import { getCorsOptions } from '@/backend/WebServer/cors';

/**
 * Express Application Assembler
 * Configures the server with GraphQL Yoga and required middlewares.
 */
export function runWebServer() {
  const app = express();
  const graphqlJsonLimit = process.env.GRAPHQL_JSON_LIMIT || '1mb';
  const publicRequestTimeoutMs = Number(process.env.PUBLIC_REQUEST_TIMEOUT_MS || 15_000);
  const publicRateLimitWindowMs = Number(process.env.PUBLIC_RATE_LIMIT_WINDOW_MS || 60_000);
  const publicRateLimitMaxRequests = Number(process.env.PUBLIC_RATE_LIMIT_MAX_REQUESTS || 120);
  
  // 1. Basic Middlewares
  app.use(cors(getCorsOptions()));

  // 2. Legacy Support Endpoints
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok'
    });
  });

  app.get('/api/config', (req: Request, res: Response) => {
    res.json({
      googleClientId: process.env.GOOGLE_CLIENT_ID || ''
    });
  });


  // 4. Bind Yoga to the /graphql endpoint
  app.use(
    '/graphql',
    createRequestTimeout(publicRequestTimeoutMs),
    createRateLimiter({
      windowMs: publicRateLimitWindowMs,
      maxRequests: publicRateLimitMaxRequests,
    }),
    express.json({ limit: graphqlJsonLimit }),
    handleGraphQLRequests(),
  );

  return app;
}

function createRequestTimeout(timeoutMs: number): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    req.setTimeout(timeoutMs, () => {
      if (!res.headersSent) {
        res.status(408).json({ error: 'Request timed out' });
      }
    });
    next();
  };
}

function createRateLimiter(options: {
  windowMs: number;
  maxRequests: number;
}): RequestHandler {
  const buckets = new Map<string, { count: number; resetAt: number }>();

  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    const key = req.ip || req.socket.remoteAddress || 'unknown';
    const bucket = buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      buckets.set(key, {
        count: 1,
        resetAt: now + options.windowMs,
      });
      next();
      return;
    }

    bucket.count += 1;

    if (bucket.count > options.maxRequests) {
      res.setHeader('Retry-After', Math.ceil((bucket.resetAt - now) / 1000));
      res.status(429).json({ error: 'Too many requests' });
      return;
    }

    next();
  };
}
