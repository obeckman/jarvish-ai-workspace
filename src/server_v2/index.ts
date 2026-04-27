import 'dotenv/config';
import { createApp } from './app.js';
import weaviate, { EmbeddedOptions } from 'weaviate-ts-embedded';
import path from 'node:path';
import { WeaviateVectorStore } from './services/memory/weaviate.store.js';
import { setVectorStore } from './services/memory/memory.service.js';

const PORT = process.env.PORT || 4000; // Use a different port for v2 during dev

/**
 * Main Server Bootstrapper
 * 1. Initializes Infrastructure (Weaviate)
 * 2. Injects Dependencies
 * 3. Starts the API Server
 */
async function bootstrap() {
  console.log("--- Initializing Jarvish Server v2 (Modular) ---");

  // 1. Initialize Weaviate Embedded
  const embeddedOptions = new EmbeddedOptions({
    port: 8081, // Port for v2 DB
    env: {
      DEFAULT_VECTORIZER_MODULE: 'none',
      PERSISTENCE_DATA_PATH: path.join(process.cwd(), 'src', 'server_v2', 'weaviate_data'),
    },
  });

  const client = weaviate.client(embeddedOptions, {
    host: 'localhost:8081',
    scheme: 'http'
  });

  try {
    console.log("[Infra] Starting Weaviate...");
    await client.embedded.start();
    
    // 2. Setup Vector Store
    const vectorStore = new WeaviateVectorStore(client);
    await vectorStore.ensureSchema();
    setVectorStore(vectorStore);
    
    console.log("[Infra] Database and Schema ready.");

    // 3. Start Express
    const app = createApp();
    app.listen(PORT, () => {
      console.log(`[API] Server is running at http://localhost:${PORT}/graphql`);
    });

  } catch (error) {
    console.error("[Fatal Startup Error]", error);
    process.exit(1);
  }
}

bootstrap();
