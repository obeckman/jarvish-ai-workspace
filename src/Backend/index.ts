import 'dotenv/config';
import { runWebServer } from '@/Backend/WebServer';
import { runVectorDatabase } from '@/Backend/VectorDB';
import { logger } from '@/Backend/utils/logger';

const PORT = process.env.PORT || 3000; // Match old server's port

/**
 * Main Server Bootstrapper
 * 1. Initializes Infrastructure (Weaviate)
 * 2. Injects Dependencies
 * 3. Starts the API Server
 */
async function initializingBEServer() {
  logger.info("--- Initializing BE Server ---");

  try {
    // 3. Start Express
    await runVectorDatabase();

    const app = runWebServer();
    app.listen(PORT, () => {
      logger.info(`[API] Server is running at http://localhost:${PORT}/graphql`);
    });

  } catch (error) {
    logger.error({ error }, "[Fatal Startup Error]");
    process.exit(1);
  }
}

initializingBEServer();
