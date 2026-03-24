import { Pinecone } from '@pinecone-database/pinecone';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Requires PINECONE_API_KEY, PINECONE_INDEX_NAME, and GEMINI_API_KEY in .env

export interface Memory {
  id: string;
  text: string;
  score: number;
  metadata?: Record<string, any>;
}

export async function retrieveMemories(query: string, topK: number = 5): Promise<Memory[]> {
  console.log(`[Memory] Retrieving memories for query: "${query}"`);
  
  try {
    const pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY as string,
    });
    const indexName = process.env.PINECONE_INDEX_NAME as string;
    const index = pinecone.Index(indexName);
    
    console.log(`[Memory] Connected to Pinecone index: ${indexName}`);

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);
    const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
    
    console.log(`[Memory] Generating embedding for query...`);
    // Generate embedding for the user query
    const result = await model.embedContent(query);
    const embedding = result.embedding.values;
    console.log(`[Memory] Embedding generated successfully.`);

    // Retrieve top-k semantic matches
    console.log(`[Memory] Querying Pinecone for top ${topK} matches...`);
    const queryResponse = await index.query({
      vector: embedding,
      topK,
      includeMetadata: true,
    });

    console.log(`[Memory] Found ${queryResponse.matches.length} matching memories.`);
    
    return queryResponse.matches.map(match => {
      const text = match.metadata?.text as string || '';
      console.log(`[Memory] Match ID: ${match.id}, Score: ${match.score?.toFixed(4)}, Text: ${text.substring(0, 50)}...`);
      return {
        id: match.id,
        text,
        score: match.score || 0,
        metadata: match.metadata,
      };
    });
  } catch (error) {
    console.error(`[Memory Error]`, error);
    throw error;
  }
}
