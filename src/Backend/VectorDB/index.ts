
import 'dotenv/config';
import weaviateEmbedded, { EmbeddedOptions } from 'weaviate-ts-embedded';
import weaviate from 'weaviate-client';
import path from 'node:path';
import { WeaviateVectorStore,  } from '@/Backend/services/memory/weaviate.store';
import { setVectorStore } from '@/Backend/services/memory/memory.service';

// Initialize Weaviate Embedded, lightweight, embedded instance of the Weaviate vector database
export const runVectorDatabase = async () => {

  console.log("--- Initializing Vector Database ---");
    // 1. Initialize Weaviate Embedded, lightweight, embedded instance of the Weaviate vector database
  const embeddedOptions = new EmbeddedOptions({
    port: 8080, // Match old server's DB port
    env: {
      DEFAULT_VECTORIZER_MODULE: 'none',
      PERSISTENCE_DATA_PATH: path.join(process.cwd(), 'src', 'Backend', 'weaviate_data'),
    },
  });

  const embeddedClient = weaviateEmbedded.client(embeddedOptions);

  try {
    console.log("[Infra] Starting Initializing Vector Database Weaviate...");
    await embeddedClient.embedded.start();
    
    // 2. Connect using the modern v3 client
    const client = await weaviate.connectToLocal({
      port: 8080
    });

    // 3. Setup Vector Store
    const vectorStore = new WeaviateVectorStore(client);
    await vectorStore.ensureSchema();
    setVectorStore(vectorStore);
    
    console.log("[Infra] Initializing Vector Database and Schema ready.");

  } catch (error) {
    console.error("[Fatal Startup Error in initializeVectorDatabase]", error);
    process.exit(1);
  }
}
