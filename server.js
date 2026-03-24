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

server.get('/more-items', (req, res) => {
  const { lastId = 0, limit = 10 } = req.query;
  const db = router.db; // Access lowdb instance
  
  
  console.log('db',db.get('useInfiniteVirtualizedScroll'));
  // Filter items greater than the provided ID
  const items = db.get('useInfiniteVirtualizedScroll')
    .filter(item => item.id > parseInt(lastId))
    .take(parseInt(limit))
    .value();

  const lastItem = items[items.length - 1];
  const total = db.get('useInfiniteVirtualizedScroll').size().value();

  res.jsonp({
    items: items,
    paginationInfo: {
      total: total,
      nextPageId: lastItem ? lastItem.id : null,
      hasMore: items.length === parseInt(limit)
    }
  });
});

// --- AGENT CONFIGURATION ---
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Define a tool that the Agent can use to "check the system status"
const functions = {
  checkSystemStatus: ({ component }) => {
    return { status: "Online", latency: "12ms", target: component };
  }
};

const tools = [
  {
    functionDeclarations: [
      {
        name: "checkSystemStatus",
        description: "Checks the status of a specific server component",
        parameters: {
          type: "OBJECT",
          properties: {
            component: { type: "STRING", description: "The name of the component, e.g., 'database' or 'api'" }
          },
          required: ["component"]
        }
      }
    ]
  }
];

const model = genAI.getGenerativeModel({
  model: "gemini-3-flash-preview",
  tools: tools,
  systemInstruction: "You are a helpful AI Agent focused on full-stack development..."
});


server.post('/chat', async (req, res) => {
  const { message } = req.body;

  try {
    const chat = model.startChat();
    let result = await chat.sendMessage(message);
    let response = result.response;

    // 1. Get all function calls (Gemini might ask for multiple)
    const calls = response.functionCalls();

    if (calls && calls.length > 0) {
      // Create a list of responses for every tool requested
      const toolResponses = calls.map((call) => {
        console.log(`[Agent] Calling tool: ${call.name} with`, call.args);
        
        // Execute your local JS logic
        const data = functions[call.name](call.args);

        return {
          functionResponse: {
            name: call.name,
            response: { content: data } // Wrap your data in a 'content' key
          }
        };
      });

      // 2. Send the "Observation" back to the "Brain"
      const finalResult = await chat.sendMessage(toolResponses);
      return res.json({ reply: finalResult.response.text() });
    }

    res.json({ reply: response.text() });
  } catch (error) {
    // THIS IS KEY: Log the full error to see why it's 500
    console.error("Gemini Error Details:", error); 
    res.status(500).json({ error: error.message });
  }
});


// --- CONTEXT-AWARE AGENT ---
import { retrieveMemories } from './server/agent/memory.js';
import { getOptimizedContext, runAgentTask } from './server/agent/agent.js';
import { executeInventoryCheck } from './server/agent/tools.js';

server.post('/api/agent', async (req, res) => {
  const { query } = req.body;

  if (!query) {
    console.log('[Agent] Rejected empty query');
    return res.status(400).json({ error: "Query is required" });
  }

  // Set headers for streaming (NDJSON)
  res.setHeader('Content-Type', 'application/x-ndjson');
  res.setHeader('Transfer-Encoding', 'chunked');

  try {
    console.log(`\n--- [Agent] START NEW REQUEST: "${query}" ---`);
    
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
    const { stream, chat } = await runAgentTask(query, context);

    console.log('[Agent] Streaming response chunks...');
    for await (const chunk of stream) {
      const calls = chunk.functionCalls();
      
      if (calls?.length) {
        console.log(`[Agent] Agent requested ${calls.length} tool calls.`);
        // Execute any tool calls requested by Gemini (Step 2.1)
        const toolResponses = [];
        for (const call of calls) {
          console.log(`[Agent] Tool Request: ${call.name}(${JSON.stringify(call.args)})`);
          if (call.name === 'check_inventory') {
            const result = await executeInventoryCheck(call.args as any);
            console.log(`[Agent] Tool Result: ${result}`);
            toolResponses.push({
              functionResponse: {
                name: call.name,
                response: { result }
              }
            });
          }
        }
        
        // Feed tool results back to the agent and stream its final thoughts
        console.log('[Agent] Feeding tool responses back to agent...');
        const finalStream = await chat.sendMessageStream(toolResponses);
        for await (const fChunk of finalStream) {
          const text = fChunk.text();
          if (text) {
            console.log(`[Agent] Final Response Chunk: ${text.substring(0, 50)}...`);
            res.write(JSON.stringify({ type: 'message', content: text }) + '\n');
          }
        }
      } else {
        const text = chunk.text();
        if (text) {
          console.log(`[Agent] Response Chunk: ${text.substring(0, 50)}...`);
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
  console.log('JSON Server is running');
  console.log('Agent-Ready Server running on http://localhost:3000');
});