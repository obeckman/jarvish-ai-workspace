
import 'dotenv/config';
import weaviate, { EmbeddedOptions } from 'weaviate-ts-embedded';
import path from 'node:path';
import { WeaviateVectorStore } from '@/server_v2/services/memory/weaviate.store';
import { setVectorStore } from '@/server_v2/services/memory/memory.service';

// Initialize Weaviate Embedded, lightweight, embedded instance of the Weaviate vector database
export const runVectorDatabase = async () => {

  console.log("--- Initializing Vector Database ---");
    // 1. Initialize Weaviate Embedded, lightweight, embedded instance of the Weaviate vector database
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
    console.log("[Infra] Starting Initializing Vector Database Weaviate...");
    await client.embedded.start();
    
    // 2. Setup Vector Store
    const vectorStore = new WeaviateVectorStore(client);
    await vectorStore.ensureSchema();
    setVectorStore(vectorStore);
    
    console.log("[Infra] Initializing Vector Database and Schema ready.");

    

  } catch (error) {
    console.error("[Fatal Startup Error in initializeVectorDatabase]", error);
    process.exit(1);
  }
}
