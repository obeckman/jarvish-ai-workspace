import { WeaviateClient } from 'weaviate-client';
import { IVectorStore, Memory } from '@/server_v2/services/memory/vector_store.interface';

/**
 * Weaviate Implementation of the Vector Store.
 * Handles schema creation, data insertion, and semantic search.
 */
export class WeaviateVectorStore implements IVectorStore {
  private client: WeaviateClient;
  private readonly className = 'Memory';

  constructor(client: WeaviateClient) {
    this.client = client;
  }

  /**
   * Checks if the 'Memory' class exists in Weaviate, creating it if not.
   */
  async ensureSchema(): Promise<void> {
    console.log(`[Weaviate] Ensuring schema for class: ${this.className}...`);
    try {
      const schema = await this.client.schema.getter().do();
      const classExists = schema.classes?.some((c) => c.class === this.className);

      if (!classExists) {
        console.log(`[Weaviate] Creating class: ${this.className}`);
        try {
          await this.client.schema
            .classCreator()
            .withClass({
              class: this.className,
              description: 'Agent memories and interactions',
              vectorizer: 'none', // We provide vectors manually via Gemini Embeddings
              properties: [
                {
                  name: 'text',
                  dataType: ['text'],
                  description: 'The content of the memory',
                },
                {
                  name: 'metadata',
                  dataType: ['text'], // Metadata is stored as a JSON string for flexibility
                  description: 'JSON stringified metadata',
                },
              ],
            })
            .do();
        } catch (innerError: any) {
          // If another process created it in the meantime, ignore
          if (innerError.message?.includes('already exists')) {
            console.log(`[Weaviate] Class ${this.className} was created by another process.`);
            return;
          }
          throw innerError;
        }
      }
    } catch (error) {
      console.error('[Weaviate Schema Error]', error);
      throw error;
    }
  }

  /**
   * Adds a document to Weaviate with a manually provided vector.
   */
  async add(text: string, embedding: number[], metadata: Record<string, any>): Promise<void> {
    try {
      await this.client.data
        .creator()
        .withClassName(this.className)
        .withProperties({
          text,
          metadata: JSON.stringify(metadata),
        })
        .withVector(embedding)
        .do();
    } catch (error) {
      console.error('[Weaviate Add Error]', error);
      throw error;
    }
  }

  /**
   * Performs a nearVector search to find semantically similar documents.
   */
  async search(queryEmbedding: number[], topK: number): Promise<Memory[]> {
    try {
      const result = await this.client.graphql
        .get()
        .withClassName(this.className)
        .withFields('text metadata _additional { distance id }')
        .withNearVector({
          vector: queryEmbedding,
        })
        .withLimit(topK)
        .do();

      const objects = result.data?.Get?.[this.className] || [];
      
      return objects.map((obj: any) => ({
        id: obj._additional.id,
        text: obj.text,
        score: 1 - (obj._additional.distance || 0),
        metadata: obj.metadata ? JSON.parse(obj.metadata) : {},
      }));
    } catch (error) {
      console.error('[Weaviate Search Error]', error);
      return [];
    }
  }

  /**
   * Deletes a document by its ID.
   */
  async delete(id: string): Promise<void> {
    try {
      await this.client.data
        .deleter()
        .withClassName(this.className)
        .withId(id)
        .do();
    } catch (error) {
      console.error('[Weaviate Delete Error]', error);
      throw error;
    }
  }
}
