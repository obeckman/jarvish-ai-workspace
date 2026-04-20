import jsonServer from 'json-server';
import { GoogleGenerativeAI } from "@google/generative-ai";
import express from 'express';
import 'dotenv/config';
import process from 'node:process';
import path from 'node:path';

// Weaviate Embedded
import weaviate, { EmbeddedOptions } from 'weaviate-ts-embedded';
import { WeaviateVectorStore } from './agent/WeaviateVectorStore.js';
import { setVectorStore } from './agent/memory.js';

const startServer = async () => {
  console.log("--- Initializing Weaviate Embedded (WSL2) ---");
  
  const client = weaviate.client(
    new EmbeddedOptions({
      port: 8080,
      version: '1.23.7',
      env: {
        DEFAULT_VECTORIZER_MODULE: 'none',
        PERSISTENCE_DATA_PATH: path.join(process.cwd(), 'src', 'server', 'weaviate_data'),
      },
    })
  );

  try {
    await client.embedded.start();
    console.log("[Weaviate] Embedded instance started.");

    const vectorStore = new WeaviateVectorStore(client);
    await vectorStore.ensureSchema();
    setVectorStore(vectorStore);
    console.log("[Weaviate] Schema verified and store injected.");
  } catch (error) {
    console.error("[Weaviate Startup Error]", error);
    process.exit(1);
  }

  console.log("Key Loaded:", process.env.GEMINI_API_KEY ? "YES (starts with AIza)" : "NO");
  const server = jsonServer.create();
  const router = jsonServer.router('api.json');
  const middlewares = jsonServer.defaults();

  // We use express.json() to parse incoming chat prompts
  server.use(express.json()); 
  server.use(middlewares);

  // --- CONFIG ENDPOINT ---
  server.get('/api/config', (req, res) => {
    res.json({
      googleClientId: process.env.GOOGLE_CLIENT_ID || ''
    });
  });

  // --- SHARED API ENDPOINTS ---
  server.get('/more-items', (req, res) => {
    const { lastId = 0, limit = 10 } = req.query;
    const db = router.db; // Access lowdb instance
    const items = db.get('useInfiniteVirtualizedScroll')
      .filter(item => item.id > parseInt(lastId as string))
      .take(parseInt(limit as string))
      .value();

    const lastItem = items[items.length - 1];
    const total = db.get('useInfiniteVirtualizedScroll').size().value();

    res.jsonp({
      items: items,
      paginationInfo: {
        total: total,
        nextPageId: lastItem ? lastItem.id : null,
        hasMore: items.length === parseInt(limit as string)
      }
    });
  });

  // --- SIMPLE CHAT AGENT (Legacy) ---
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const legacyModel = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: "You are a helpful AI Agent focused on full-stack development..."
  });

  server.post('/chat', async (req, res) => {
    const { message } = req.body;
    try {
      const chat = legacyModel.startChat();
      let result = await chat.sendMessage(message);
      res.json({ reply: result.response.text() });
    } catch (error) {
      console.error("Gemini Error Details:", error); 
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  // --- CONTEXT-AWARE AGENT (Advanced) ---
  const { retrieveMemories } = await import('./agent/memory.js');
  const { getOptimizedContext, runAgentTask } = await import('./agent/agent.js');
  const { executeInventoryCheck } = await import('./agent/tools.js');
  const { listCalendarEvents, searchGmailMessages, getGoogleDocContent } = await import('./agent/google_tools.js');

  server.post('/api/agent', async (req, res) => {
    const { query } = req.body;
    const googleToken = req.headers['x-google-token'] as string | undefined;

    if (!query) {
      return res.status(400).json({ error: "Query is required" });
    }

    res.setHeader('Content-Type', 'application/x-ndjson');
    res.setHeader('Transfer-Encoding', 'chunked');

    try {
      const memories = await retrieveMemories(query);
      const context = await getOptimizedContext(query, memories);
      res.write(JSON.stringify({ type: 'context', content: context }) + '\n');

      const { stream, chat } = await runAgentTask(query, context, googleToken);

      for await (const chunk of stream) {
        const calls = chunk.functionCalls();
        if (calls?.length) {
          const toolResponses = [];
          for (const call of calls) {
            let result: any;
            if (call.name === 'check_inventory') {
              result = await executeInventoryCheck(call.args as any);
            } else if (googleToken) {
              if (call.name === 'list_calendar_events') {
                result = await listCalendarEvents(googleToken, call.args as any);
              } else if (call.name === 'search_gmail_messages') {
                result = await searchGmailMessages(googleToken, call.args as any);
              } else if (call.name === 'get_google_doc_content') {
                result = await getGoogleDocContent(googleToken, call.args as any);
              }
            }
            if (result !== undefined) {
              toolResponses.push({ functionResponse: { name: call.name, response: { result } } });
            }
          }
          if (toolResponses.length > 0) {
            const finalStream = await chat.sendMessageStream(toolResponses);
            for await (const fChunk of finalStream) {
              const text = fChunk.text();
              if (text) res.write(JSON.stringify({ type: 'message', content: text }) + '\n');
            }
          }
        } else {
          const text = chunk.text();
          if (text) res.write(JSON.stringify({ type: 'message', content: text }) + '\n');
        }
      }
      res.end();
    } catch (error) {
      console.error("[Agent Error]", error);
      res.write(JSON.stringify({ type: 'error', content: error instanceof Error ? error.message : 'Unknown error' }) + '\n');
      res.end();
    }
  });

  server.use(router);
  server.listen(3000, () => {
    console.log('JSON Server + AI Agent + Weaviate running on http://localhost:3000');
  });
};

startServer();
