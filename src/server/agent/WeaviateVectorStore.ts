import { WeaviateClient } from 'weaviate-client';
import { IVectorStore } from './vector_store.interface';
import { Memory } from './memory';

export class WeaviateVectorStore implements IVectorStore {
  private client: WeaviateClient;
  private readonly className = 'Memory';

  constructor(client: WeaviateClient) {
    this.client = client;
  }

  async ensureSchema(): Promise<void> {
    console.log(`[Weaviate] Ensuring schema for class: ${this.className}...`);
    try {
      const schema = await this.client.schema.getter().do();
      const classExists = schema.classes?.some((c) => c.class === this.className);

      if (!classExists) {
        console.log(`[Weaviate] Creating class: ${this.className}`);
        await this.client.schema
          .classCreator()
          .withClass({
            class: this.className,
            description: 'Agent memories and interactions',
            vectorizer: 'none', // We provide vectors manually from Gemini
            properties: [
              {
                name: 'text',
                dataType: ['text'],
                description: 'The content of the memory',
              },
              {
                name: 'metadata',
                dataType: ['text'],
                description: 'JSON stringified metadata',
              },
            ],
          })
          .do();
      }
    } catch (error) {
      console.error('[Weaviate Schema Error]', error);
      throw error;
    }
  }

  async add(text: string, embedding: number[], metadata: Record<string, any>): Promise<void> {
    console.log(`[Weaviate] Adding new memory object...`);
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
      console.log(`[Weaviate] Memory saved successfully.`);
    } catch (error) {
      console.error('[Weaviate Add Error]', error);
      throw error;
    }
  }

  async search(queryEmbedding: number[], topK: number): Promise<Memory[]> {
    console.log(`[Weaviate] Performing semantic search (GraphQL Fluent API)...`);
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
        score: 1 - (obj._additional.distance || 0), // Convert distance to similarity score
        metadata: obj.metadata ? JSON.parse(obj.metadata) : {},
      }));
    } catch (error) {
      console.error('[Weaviate Search Error]', error);
      return [];
    }
  }
}
