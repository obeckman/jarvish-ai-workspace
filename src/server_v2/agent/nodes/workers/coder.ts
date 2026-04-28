import { GoogleGenerativeAI } from "@google/generative-ai";
import { AgentStateType } from "@/server_v2/agent/state";
import { REASONING_MODEL } from "@/server_v2/agent/models";
import { ROLES, TOOL_NAMES, STAGES, NODE_NAMES } from "@/server_v2/agent/constants";
import { mapStateToGeminiHistory } from "../utils";
import { 
  readFileDeclaration, 
  writeFileDeclaration,
  addMemoryDeclaration,
  forgetMemoryDeclaration,
  inventoryToolDeclaration
} from "@/server_v2/agent/nodes/registry";

/**
 * Node: Coder Worker
 * Specialized in local system operations, codebase analysis, and technical implementation.
 */
export async function coderWorkerNode(state: AgentStateType) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  
  const systemInstruction = `You are the Coder Worker. Your job is to handle technical tasks, codebase analysis, and local operations.
  
  STRICT PROTOCOLS:
  1. PRECISION MANDATE: When reading local files, report the exact content or relevant snippets. Never guess code or file structures.
  2. CODE QUALITY: Suggest idiomatic, clean, and maintainable code that follows project patterns.
  3. COLLABORATION: Use write_file to apply approved changes to the codebase. Always explain what you changed.
  4. MEMORY ACCURACY: Only add facts to memory that have been explicitly confirmed by the user or verified by other workers.
  5. INVENTORY TRUTH: Report live inventory status exactly as returned by the tool.

  AVAILABLE TOOLS:
  - read_file: For reading local codebase files.
  - write_file: For writing or updating local files.
  - add_to_memory: For saving facts to long-term storage.
  - check_inventory: For checking product status.`;

  const model = genAI.getGenerativeModel({
    model: REASONING_MODEL,
    systemInstruction,
    tools: [{
      functionDeclarations: [
        readFileDeclaration as any,
        writeFileDeclaration as any,
        addMemoryDeclaration as any,
        forgetMemoryDeclaration as any,
        inventoryToolDeclaration as any
      ]
    }]
  });

  const history = mapStateToGeminiHistory(state);
  const lastMsg = history.pop();
  
  if (!lastMsg) throw new Error("No messages found for Coder Worker.");

  const chat = model.startChat({ history });
  const result = await chat.sendMessage(lastMsg.parts);
  const response = result.response;
  
  return {
    messages: [{
      role: ROLES.MODEL,
      content: response.text(),
      tool_calls: response.functionCalls(),
      name: "coder_worker"
    }],
    lastWorker: NODE_NAMES.CODER_WORKER,
    metadata: { stage: STAGES.RESEARCH, status: "Coder Worker is analyzing code..." }
  };
}
