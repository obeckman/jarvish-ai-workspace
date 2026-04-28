import jsonServer from 'json-server';
import { GoogleGenerativeAI } from "@google/generative-ai";
import express from 'express';
import 'dotenv/config';
import process from 'node:process';
import path from 'node:path';

// Weaviate Embedded
import weaviate, { EmbeddedOptions } from 'weaviate-ts-embedded';
import { WeaviateVectorStore } from './agent/WeaviateVectorStore';
import { setVectorStore } from './agent/memory';

const startServer = async () => {
  const PORT = process.env.PORT || 3000;
  const server = jsonServer.create();
  const router = jsonServer.router('api.json');
  const middlewares = jsonServer.defaults();

  // We use express.json() to parse incoming chat prompts with a higher limit for file uploads
  server.use(express.json({ limit: '20mb' })); 
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
    model: "gemini-2.5-flash",
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
  const { TOOL_NAMES } = await import('../shared/jarvish.constants.js');
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

    const { query, history: incomingHistory = [], attachments = [] } = req.body;
    const googleToken = req.headers['x-google-token'] as string | undefined;

    if (!query && attachments.length === 0) {
      return res.status(400).json({ error: "Query or attachment is required" });
    }

    res.setHeader('Content-Type', 'application/x-ndjson');
    res.setHeader('Transfer-Encoding', 'chunked');

    try {
      res.write(JSON.stringify({ type: 'status', stage: 1, content: "Retrieving relevant memories..." }) + '\n');
      const memories = await retrieveMemories(query || "file analysis").catch(err => {
        console.warn("[Server] Memory retrieval failed, proceeding without context.", err);
        return [];
      });

      const { getAgentConfig } = await import('./agent/agent.js');
      const { model, firstMessageParts } = await getAgentConfig(query || "Analyzing attached file.", memories, googleToken, attachments);

      // Map incomingHistory (from FE) to Gemini parts
      const processedHistory = incomingHistory.map((m: any) => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }]
      })).slice(-10); // Last 10 messages for short-term context

      const runAgentLoop = async (attemptsLeft = 2, useStreaming = true): Promise<void> => {
        const history: any[] = [...processedHistory];
        let currentParts = firstMessageParts;
        let accumulatedText = "";

        try {
          while (true) {
            res.write(JSON.stringify({ type: 'status', stage: 3, content: "Jarvish is thinking..." }) + '\n');
            
            let finalResponse;
            let modelParts: any[] = [];
            let hasFunctionCalls = false;
            const toolResponses: any[] = [];

            if (useStreaming) {
              let result;
              try {
                result = await model.generateContentStream({ contents: [...history, { role: 'user', parts: currentParts }] });
                history.push({ role: 'user', parts: currentParts });

                for await (const chunk of result.stream) {
                  const text = chunk.text();
                  if (text) {
                    accumulatedText += text;
                    res.write(JSON.stringify({ type: 'message', content: text }) + '\n');
                  }
                }
                finalResponse = await result.response;
              } catch (streamError: any) {
                console.error("[Stream Error - Switching to Stable Mode]", streamError);
                if (result) result.response.catch(() => {});
                throw streamError;
              }
            } else {
              // STABLE MODE (Non-streaming)
              console.log("[Server] Using Stable Mode (Non-streaming) for this turn.");
              const result = await model.generateContent({ contents: [...history, { role: 'user', parts: currentParts }] });
              history.push({ role: 'user', parts: currentParts });
              finalResponse = result.response;
              const text = finalResponse.text();
              if (text) {
                accumulatedText += text;
                res.write(JSON.stringify({ type: 'message', content: text }) + '\n');
              }
            }

            const calls = finalResponse.functionCalls();
            modelParts = finalResponse.candidates?.[0].content.parts || [];
            history.push({ role: 'model', parts: modelParts });

            if (calls?.length) {
              hasFunctionCalls = true;
              for (const call of calls) {
                const statusMsg = `Researching: ${call.name.replace(/_/g, ' ')}...`;
                res.write(JSON.stringify({ type: 'status', stage: 2, content: statusMsg }) + '\n');
                console.log(`[Agent] Executing tool: ${call.name}`);
                
                let toolResult: any;
                try {
                  if (call.name === TOOL_NAMES.CHECK_INVENTORY) toolResult = await executeInventoryCheck(call.args as any);
                  else if (call.name === TOOL_NAMES.WEB_SEARCH) toolResult = await executeWebSearch(call.args as any);
                  else if (call.name === TOOL_NAMES.FETCH_WEB_PAGE) toolResult = await executeFetchWebPage(call.args as any);
                  else if (call.name === TOOL_NAMES.READ_PDF) toolResult = await executeReadPdf(call.args as any);
                  else if (call.name === TOOL_NAMES.READ_FILE) toolResult = await executeReadFile(call.args as any);
                  else if (call.name === TOOL_NAMES.ADD_MEMORY) toolResult = await executeAddMemory(call.args as any);
                  else if (googleToken) {
                    if (call.name === TOOL_NAMES.LIST_CALENDAR) toolResult = await listCalendarEvents(googleToken, call.args as any);
                    else if (call.name === TOOL_NAMES.SEARCH_GMAIL) toolResult = await searchGmailMessages(googleToken, call.args as any);
                    else if (call.name === TOOL_NAMES.GET_GOOGLE_DOC) toolResult = await getGoogleDocContent(googleToken, call.args as any);
                    else toolResult = `Error: Tool ${call.name} not implemented.`;
                  } else toolResult = "Error: User not authenticated.";
                } catch (e: any) { toolResult = `Error: ${e.message}`; }
                toolResponses.push({ functionResponse: { name: call.name, response: { result: toolResult } } });
              }
            }

            if (hasFunctionCalls && toolResponses.length > 0) {
              currentParts = toolResponses;
            } else {
              break;
            }
          }

          // Step 3: Automatic persistence of this turn into Long-Term Memory
          if (accumulatedText.length > 50) {
            res.write(JSON.stringify({ type: 'status', stage: 4, content: "Jarvish is remembering this interaction..." }) + '\n');
            const summary = `Conversation Summary [${new Date().toLocaleTimeString()}]:\nUser: ${query}\nAssistant: ${accumulatedText.substring(0, 500)}...`;
            await executeAddMemory({ fact: summary, category: 'history' }).catch(err => console.error("[Memory Persistence Error]", err));
          }

        } catch (error: any) {
          const errorMessage = error.message || "";
          const isQuotaError = error.status === 429 || errorMessage.includes("429") || errorMessage.includes("quota");
          
          if (attemptsLeft > 0 && (isQuotaError || error.status === 503 || errorMessage.includes("stream") || errorMessage.includes("parse"))) {
            let waitTime = 5000;
            const retryMatch = errorMessage.match(/retry in ([\d.]+)s/i);
            
            if (retryMatch && retryMatch[1]) {
              waitTime = Math.ceil(parseFloat(retryMatch[1]) * 1000) + 2000;
            } else if (errorMessage.includes("57s")) {
              waitTime = 60000;
            }

            console.warn(`[Server] Quota hit/Stream error. Retrying in stable mode in ${waitTime}ms... (${attemptsLeft} left)`);
            
            // Stream the retry info to the frontend
            res.write(JSON.stringify({ 
              type: 'status', 
              stage: 0, 
              content: `Capacity reached. Auto-resuming in stable mode in ${Math.round(waitTime/1000)}s...`,
              retryIn: waitTime
            }) + '\n');

            await new Promise(r => setTimeout(r, waitTime));
            // CRITICAL: Disable streaming for the next attempt
            return runAgentLoop(attemptsLeft - 1, false);
          }
          throw error;
        }
      };

      await runAgentLoop(2, true);
      res.end();
    } catch (error) {
      console.error("[Agent Final Error]", error);
      res.write(JSON.stringify({ type: 'error', content: "System reached its capacity. Please try again in a few minutes." }) + '\n');
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

    // Global Safety Net: Prevent unhandled promise rejections from crashing the server
    process.on('unhandledRejection', (reason, promise) => {
      console.error('[FATAL] Unhandled Rejection at:', promise, 'reason:', reason);
    });

    process.on('uncaughtException', async (err) => {
      console.error('[FATAL] Uncaught Exception:', err);
      // Try to shutdown cleanly but exit eventually
      setTimeout(() => process.exit(1), 5000);
      await shutdown().catch(() => process.exit(1));
    });

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
