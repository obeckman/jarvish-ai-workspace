import { WeaviateClient } from 'weaviate-client';
import { IVectorStore, Memory, MemoryMetadata } from '@/Backend/services/memory/vector_store.interface';
import { logger } from '@/Backend/utils/logger';

type WeaviateMemoryObject = {
  uuid: string;
  properties: {
    text?: string;
    metadata?: string;
  };
  metadata?: {
    distance?: number;
  };
};
/**
 * Weaviate Implementation of the Vector Store using Client v3 (Collections API).
 * Handles schema creation, data insertion, and semantic search.
 */
export class WeaviateVectorStore implements IVectorStore {
  private client: WeaviateClient;
  private readonly className = 'Memory';

  constructor(client: WeaviateClient) {
    this.client = client;
  }

  /**
   * Checks if the 'Memory' collection exists in Weaviate, creating it if not.
   */
  async ensureSchema(): Promise<void> {
    logger.info(`[Weaviate] Ensuring schema for collection: ${this.className}...`);
    try {
      const exists = await this.client.collections.exists(this.className);

      if (!exists) {
        logger.info(`[Weaviate] Creating collection: ${this.className}`);
        await this.client.collections.create({
          name: this.className,
          properties: [
            {
              name: 'text',
              dataType: 'text',
              description: 'The content of the memory',
            },
            {
              name: 'metadata',
              dataType: 'text', // Metadata is stored as a JSON string for flexibility
              description: 'JSON stringified metadata',
            },
          ],
          // In v3, we provide vectors manually, so we don't need a default vectorizer module
        });
      }
    } catch (error) {
      logger.error(error,'[Weaviate Schema Error]');
      throw error;
    }
  }

  /**
   * Adds a document to Weaviate with a manually provided vector.
   */
  async add(text: string, embedding: number[], metadata: MemoryMetadata): Promise<void> {
    try {
      const collection = this.client.collections.get(this.className);
      await collection.data.insert({
        properties: {
          text,
          metadata: JSON.stringify(metadata),
        },
        vectors: embedding,
      });
    } catch (error) {
      logger.error(error, '[Weaviate Add Error]');
      throw error;
    }
  }

  /**
   * Performs a nearVector search to find semantically similar documents.
   */
  async search(queryEmbedding: number[], topK: number): Promise<Memory[]> {
    try {
      const collection = this.client.collections.get(this.className);
      const result = await collection.query.nearVector(queryEmbedding, {
        limit: topK,
        returnMetadata: ['distance'],
      });
      
      const objects = result.objects as WeaviateMemoryObject[];

      return objects.map((obj) => ({
        id: obj.uuid,
        text: String(obj.properties.text || ""),
        score: 1 - (obj.metadata?.distance || 0),
        metadata: parseMemoryMetadata(obj.properties.metadata),
      }));
    } catch (error) {
      logger.error(error, '[Weaviate Search Error]');
      return [];
    }
  }

  /**
   * Deletes a document by its ID.
   */
  async delete(id: string): Promise<void> {
    try {
      const collection = this.client.collections.get(this.className);
      await collection.data.deleteById(id);
    } catch (error) {
      logger.error(error, '[Weaviate Delete Error]');
      throw error;
    }
  }
}

function parseMemoryMetadata(metadata: string | undefined): MemoryMetadata {
  if (!metadata) {
    return {};
  }

  try {
    const parsed = JSON.parse(metadata);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as MemoryMetadata;
    }

    return {};
  } catch (_error) {
    return {};
  }
}
