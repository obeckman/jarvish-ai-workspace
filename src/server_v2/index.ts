import 'dotenv/config';
import { createApp } from '@/server_v2/app';
import weaviate, { EmbeddedOptions } from 'weaviate-ts-embedded';
import path from 'node:path';
import { WeaviateVectorStore } from '@/server_v2/services/memory/weaviate.store';
import { setVectorStore } from '@/server_v2/services/memory/memory.service';

const PORT = process.env.PORT || 3000; // Match old server's port

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
    port: 8080, // Match old server's DB port
    env: {
      DEFAULT_VECTORIZER_MODULE: 'none',
      PERSISTENCE_DATA_PATH: path.join(process.cwd(), 'src', 'server_v2', 'weaviate_data'),
    },
  });

  const client = weaviate.client(embeddedOptions, {
    host: 'localhost:8080',
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
