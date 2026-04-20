import jsonServer from 'json-server';
import { GoogleGenerativeAI } from "@google/generative-ai";
import express from 'express';
import 'dotenv/config';
import process from 'node:process';

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
  
  console.log('db', db.get('useInfiniteVirtualizedScroll'));
  // Filter items greater than the provided ID
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
import { retrieveMemories } from './server/agent/memory.js';
import { getOptimizedContext, runAgentTask } from './server/agent/agent.js';
import { executeInventoryCheck } from './server/agent/tools.js';
import { listCalendarEvents, searchGmailMessages, getGoogleDocContent } from './server/agent/google_tools.js';

server.post('/api/agent', async (req, res) => {
  const { query } = req.body;
  // Get stateless token from header
  const googleToken = req.headers['x-google-token'] as string | undefined;

  if (!query) {
    console.log('[Agent] Rejected empty query');
    return res.status(400).json({ error: "Query is required" });
  }

  // Set headers for streaming (NDJSON)
  res.setHeader('Content-Type', 'application/x-ndjson');
  res.setHeader('Transfer-Encoding', 'chunked');

  try {
    console.log(`\n--- [Agent] START NEW REQUEST: "${query}" ---`);
    console.log(`[Agent] Google Token Provided: ${googleToken ? 'YES' : 'NO'}`);
    
    // Step 1: Long-term memory retrieval
    console.log('[Agent] Step 1: Retrieving memories...');
    const memories = await retrieveMemories(query);
    console.log(`[Agent] Step 1: Found ${memories.length} memories.`);
    
    // Step 2: Context Orchestration
    console.log('[Agent] Step 2: Orchestrating context...');
    const context = await getOptimizedContext(query, memories);
    console.log(`[Agent] Step 2: Context optimized. Sending to client...`);
    
    // Immediately stream the "Thought Trace" (Synthesized Context) to the client
    res.write(JSON.stringify({ type: 'context', content: context }) + '\n');

    // Step 3: Run Execution Agent (ReAct loop)
    console.log('[Agent] Step 3: Starting execution agent...');
    const { stream, chat } = await runAgentTask(query, context, googleToken);

    console.log('[Agent] Streaming response chunks...');
    for await (const chunk of stream) {
      const calls = chunk.functionCalls();
      
      if (calls?.length) {
        console.log(`[Agent] Agent requested ${calls.length} tool calls.`);
        const toolResponses = [];
        
        for (const call of calls) {
          console.log(`[Agent] Tool Request: ${call.name}(${JSON.stringify(call.args)})`);
          
          let result: any;
          if (call.name === 'check_inventory') {
            result = await executeInventoryCheck(call.args as any);
          } else if (googleToken) {
            // Google Tools (Stateless)
            if (call.name === 'list_calendar_events') {
              result = await listCalendarEvents(googleToken, call.args as any);
            } else if (call.name === 'search_gmail_messages') {
              result = await searchGmailMessages(googleToken, call.args as any);
            } else if (call.name === 'get_google_doc_content') {
              result = await getGoogleDocContent(googleToken, call.args as any);
            }
          } else {
            console.log(`[Agent] Denied tool ${call.name} (No Google Token)`);
            result = "Error: Please authenticate with Google to use this feature.";
          }

          if (result !== undefined) {
            console.log(`[Agent] Tool Result Success (Data length: ${JSON.stringify(result).length})`);
            toolResponses.push({
              functionResponse: {
                name: call.name,
                response: { result }
              }
            });
          }
        }
        
        if (toolResponses.length > 0) {
          console.log('[Agent] Feeding tool responses back to agent...');
          const finalStream = await chat.sendMessageStream(toolResponses);
          for await (const fChunk of finalStream) {
            const text = fChunk.text();
            if (text) {
              res.write(JSON.stringify({ type: 'message', content: text }) + '\n');
            }
          }
        }
      } else {
        const text = chunk.text();
        if (text) {
          res.write(JSON.stringify({ type: 'message', content: text }) + '\n');
        }
      }
    }

    console.log('--- [Agent] REQUEST COMPLETE ---\n');
    res.end();
  } catch (error) {
    console.error("[Agent Error]", error);
    res.write(JSON.stringify({ type: 'error', content: error instanceof Error ? error.message : 'Unknown error' }) + '\n');
    res.end();
  }
});

server.use(router);
server.listen(3000, () => {
  console.log('JSON Server + AI Agent running on http://localhost:3000');
});
