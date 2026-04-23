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
  const PORT = process.env.PORT || 3000;
  const server = jsonServer.create();
  const router = jsonServer.router('api.json');
  const middlewares = jsonServer.defaults();

  // We use express.json() to parse incoming chat prompts
  server.use(express.json()); 
  server.use(middlewares);

  // Status variable to track if Weaviate is ready
  let isReady = false;

  // --- CONFIG ENDPOINT ---
  server.get('/api/config', (req, res) => {
    res.json({
      googleClientId: process.env.GOOGLE_CLIENT_ID || ''
    });
  });

  // Health check endpoint
  server.get('/api/health', (req, res) => {
    res.json({ status: isReady ? 'ready' : 'initializing' });
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
    model: "gemini-flash-latest",
    systemInstruction: "You are a helpful AI Agent focused on full-stack development..."
  });

  server.post('/chat', async (req, res) => {
    const { message } = req.body;
    try {
      const chat = legacyModel.startChat();
      // Using simple generateContent for legacy non-streaming chat
      let result = await chat.sendMessage(message);
      res.json({ reply: result.response.text() });
    } catch (error) {
      console.error("Gemini Error Details:", error); 
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  // --- CONTEXT-AWARE AGENT (Advanced) ---
  const { retrieveMemories } = await import('./agent/memory.js');
  const { getOptimizedContext, runAgentTask, withRetry } = await import('./agent/agent.js');
  const { 
    executeInventoryCheck, 
    executeWebSearch, 
    executeFetchWebPage, 
    executeReadPdf, 
    executeReadFile, 
    executeAddMemory 
  } = await import('./agent/tools.js');
  const { listCalendarEvents, searchGmailMessages, getGoogleDocContent } = await import('./agent/google_tools.js');

  server.post('/api/agent', async (req, res) => {
    if (!isReady) {
      return res.status(503).json({ error: "System is still initializing. Please try again in a moment." });
    }

    const { query } = req.body;
    const googleToken = req.headers['x-google-token'] as string | undefined;

    if (!query) {
      return res.status(400).json({ error: "Query is required" });
    }

    res.setHeader('Content-Type', 'application/x-ndjson');
    res.setHeader('Transfer-Encoding', 'chunked');

    const runWithFreshStart = async (attemptsLeft = 3): Promise<void> => {
      try {
        const memories = await retrieveMemories(query);
        let context = "";
        
        try {
          context = await getOptimizedContext(query, memories);
          res.write(JSON.stringify({ type: 'context', content: context }) + '\n');
        } catch (ctxError) {
          console.warn("[Server] Context optimization failed, falling back to raw memories.");
          context = memories.map(m => `- ${m.text}`).join('\n');
          res.write(JSON.stringify({ type: 'context', content: "Synthesizer throttled. Using raw memories instead." }) + '\n');
        }

        // RE-IMPORT the model config logic from agent.ts but handle the loop here
        const { getAgentConfig } = await import('./agent/agent.js');
        const { model: configuredModel, firstMessageParts } = await getAgentConfig(query, context, googleToken);
        
        const history: any[] = [];
        let currentParts = firstMessageParts;

        while (true) {
          const result = await configuredModel.generateContentStream({ contents: [...history, { role: 'user', parts: currentParts }] });
          
          // Append the user turn to history
          history.push({ role: 'user', parts: currentParts });

          let hasFunctionCalls = false;
          const toolResponses: any[] = [];
          let accumulatedText = "";
          let modelParts: any[] = [];

          for await (const chunk of result.stream) {
            try {
              const text = chunk.text();
              if (text) {
                accumulatedText += text;
                res.write(JSON.stringify({ type: 'message', content: text }) + '\n');
              }
            } catch (e) {}
          }

          const finalResponse = await result.response;
          const calls = finalResponse.functionCalls();
          modelParts = finalResponse.candidates?.[0].content.parts || [];

          // Append the model's response to history
          history.push({ role: 'model', parts: modelParts });

          if (calls?.length) {
            hasFunctionCalls = true;
            for (const call of calls) {
              console.log(`[Agent] Executing tool: ${call.name}`);
              let toolResult: any;
              try {
                if (call.name === 'check_inventory') toolResult = await executeInventoryCheck(call.args as any);
                else if (call.name === 'web_search') toolResult = await executeWebSearch(call.args as any);
                else if (call.name === 'fetch_web_page') toolResult = await executeFetchWebPage(call.args as any);
                else if (call.name === 'read_pdf') toolResult = await executeReadPdf(call.args as any);
                else if (call.name === 'read_file') toolResult = await executeReadFile(call.args as any);
                else if (call.name === 'add_to_memory') toolResult = await executeAddMemory(call.args as any);
                else if (googleToken) {
                  if (call.name === 'list_calendar_events') toolResult = await listCalendarEvents(googleToken, call.args as any);
                  else if (call.name === 'search_gmail_messages') toolResult = await searchGmailMessages(googleToken, call.args as any);
                  else if (call.name === 'get_google_doc_content') toolResult = await getGoogleDocContent(googleToken, call.args as any);
                  else toolResult = `Error: Tool ${call.name} not implemented.`;
                } else toolResult = "Error: User not authenticated.";
              } catch (e: any) { toolResult = `Error: ${e.message}`; }

              toolResponses.push({ functionResponse: { name: call.name, response: { result: toolResult } } });
            }
          }

          if (hasFunctionCalls && toolResponses.length > 0) {
            currentParts = toolResponses; // Next turn is the function responses
          } else {
            break; // Done
          }
        }
      } catch (error: any) {
        if (attemptsLeft > 0 && (error.status === 429 || error.status === 503 || error.message?.includes("stream"))) {
          console.warn(`[Server] Agent session failed. Starting fresh attempt (${attemptsLeft} left)...`);
          const waitTime = error.message?.includes("57s") ? 60000 : 3000;
          await new Promise(r => setTimeout(r, waitTime));
          return runWithFreshStart(attemptsLeft - 1);
        }
        throw error;
      }
    }

    try {
      await runWithFreshStart();
      res.end();
    } catch (error) {
      console.error("[Agent Error]", error);
      res.write(JSON.stringify({ type: 'error', content: error instanceof Error ? error.message : 'Unknown error' }) + '\n');
      res.end();
    }
  });

  server.use(router);

  // Start listening FIRST to catch EADDRINUSE quickly
  const expressServer = server.listen(PORT, async () => {
    console.log(`[Server] JSON Server running on http://localhost:${PORT}`);
    
    // Now perform heavy initialization
    console.log("--- Initializing Weaviate Embedded (WSL2) ---");
    
    const embeddedOptions = new EmbeddedOptions({
      port: 8080,
      env: {
        DEFAULT_VECTORIZER_MODULE: 'none',
        PERSISTENCE_DATA_PATH: path.join(process.cwd(), 'src', 'server', 'weaviate_data'),
      },
    });

    const client = weaviate.client(embeddedOptions, {
      host: 'localhost:8080',
      scheme: 'http'
    });

    const shutdown = async () => {
      console.log("\n[Server] Shutting down cleanly...");
      try {
        await client.embedded.stop();
        expressServer.close(() => {
          console.log("[Server] Stopped.");
          process.exit(0);
        });
      } catch (err) {
        console.error("[Server] Error during shutdown:", err);
        process.exit(1);
      }
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

    try {
      await client.embedded.start();
      console.log("[Weaviate] Embedded instance started.");

      const vectorStore = new WeaviateVectorStore(client);
      await vectorStore.ensureSchema();
      setVectorStore(vectorStore);
      console.log("[Weaviate] Schema verified and store injected.");
      
      isReady = true;
      console.log("[Server] Full system ready.");
      console.log("Key Loaded:", process.env.GEMINI_API_KEY ? "YES (starts with AIza)" : "NO");
    } catch (error) {
      console.error("[Weaviate Startup Error]", error);
      await shutdown();
    }
  });
};

startServer();
