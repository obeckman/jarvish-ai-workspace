import 'dotenv/config';
import { runWebServer } from '@/Backend/WebServer';
import { runVectorDatabase } from '@/Backend/VectorDB';

const PORT = process.env.PORT || 3000; // Match old server's port

/**
 * Main Server Bootstrapper
 * 1. Initializes Infrastructure (Weaviate)
 * 2. Injects Dependencies
 * 3. Starts the API Server
 */
async function initializingBEServer() {
  console.log("--- Initializing BE Server ---");

  try {
    // 3. Start Express
    await runVectorDatabase();

    const app = runWebServer();
    app.listen(PORT, () => {
      console.log(`[API] Server is running at http://localhost:${PORT}/graphql`);
    });

  } catch (error) {
    console.error("[Fatal Startup Error]", error);
    process.exit(1);
  }
}

initializingBEServer();
