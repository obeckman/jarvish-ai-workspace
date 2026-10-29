import express, { NextFunction, Request, Response, Router } from 'express';
import { HIDING_LAG_HEADERS, type ProfileResponse } from '@/shared/hidingLag.types';
import { createSimulatedCluster, type ProfileDb, type SimulatedCluster } from './simulatedDatabase';

declare module 'express-serve-static-core' {
  interface Request {
    db?: ProfileDb;
  }
}

const DB_CONFIG = {
  REPLICATION_LAG_MS: Number(process.env.HIDING_LAG_REPLICATION_MS || 3000),
  MAX_NAME_LENGTH: 80,
} as const;

const WRITE_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

/**
 * Picks the database for each request:
 * - writes always go to the primary
 * - reads go to the primary when the client says it just wrote (x-force-primary)
 * - every other read goes to the replica
 */
export function createDbRouterMiddleware(cluster: SimulatedCluster) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (WRITE_METHODS.includes(req.method)) {
      req.db = cluster.primary;
      return next();
    }

    if (req.headers[HIDING_LAG_HEADERS.FORCE_PRIMARY] === 'true') {
      req.db = cluster.primary;
      return next();
    }

    req.db = cluster.replica;
    next();
  };
}

export function createHidingLagRouter(
  options: { replicationLagMs?: number } = {},
): Router {
  const cluster = createSimulatedCluster({
    replicationLagMs: options.replicationLagMs ?? DB_CONFIG.REPLICATION_LAG_MS,
  });
  const router = Router();

  router.use(createDbRouterMiddleware(cluster));

  router.get('/profile', async (req: Request, res: Response) => {
    const db = req.db!;
    const body: ProfileResponse = { profile: await db.getProfile(), servedBy: db.node };
    res.json(body);
  });

  router.put('/profile', express.json({ limit: '1kb' }), async (req: Request, res: Response) => {
    // add some waiting to simulate replication lag
    await new Promise(resolve => setTimeout(resolve, 1000));
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    if (!name || name.length > DB_CONFIG.MAX_NAME_LENGTH) {
      res.status(400).json({ error: `name must be 1-${DB_CONFIG.MAX_NAME_LENGTH} characters` });
      return;
    }

    const db = req.db!;
    const body: ProfileResponse = { profile: await db.updateProfileName(name), servedBy: db.node };
    res.json(body);
  });

  return router;
}
