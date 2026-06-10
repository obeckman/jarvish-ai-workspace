import 'dotenv/config';
import { createServer, type Server } from 'node:http';
import { runWebServer } from '@/backend/WebServer';
import { runVectorDatabase } from '@/backend/VectorDB';
import { logger } from '@/backend/utils/logger';

const PORT = process.env.PORT || 3000; // Match old server's port
let server: Server | null = null;

/**
 * Main Server Bootstrapper
 * 1. Initializes infrastructure adapters.
 * 2. Injects Dependencies
 * 3. Starts the API Server
 */
async function initializingBEServer() {
  logger.info("--- Initializing BE Server ---");

  try {
    await runVectorDatabase();

    const app = runWebServer();
    server = createServer(app);
    server.on('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'EADDRINUSE') {
        logger.error({ port: PORT }, "[API] Port is already in use. Set PORT to another value or stop the existing process.");
        process.exit(1);
      }

      logger.error({ error }, "[API] Server failed");
      process.exit(1);
    });
    server.listen(PORT, () => {
      logger.info(`[API] Server is running at http://localhost:${PORT}/graphql`);
    });
    server.ref();

  } catch (error) {
    logger.error({ error }, "[Fatal Startup Error]");
    process.exit(1);
  }
}

function shutdown(signal: NodeJS.Signals) {
  logger.info({ signal }, "[API] Shutting down");
  server?.close(() => process.exit(0));
}

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);

initializingBEServer();
