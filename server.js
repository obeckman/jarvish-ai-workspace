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
  model: "gemini-3-flash-preview",//"gemini-2.5-pro", 
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

server.use(router);
server.listen(3000, () => {
  console.log('JSON Server is running');
  console.log('Agent-Ready Server running on http://localhost:3000');
});