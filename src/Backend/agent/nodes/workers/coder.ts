import { GoogleGenerativeAI } from "@google/generative-ai";
import { AgentStateType } from "@/Backend/agent/state";
import { REASONING_MODEL } from "@/Backend/agent/models";
import { ROLES, TOOL_NAMES, STAGES, NODE_NAMES } from "@/shared/jarvish.constants";
import { mapStateToGeminiHistory } from "../utils";
import { AIMessage } from "@langchain/core/messages";
import { 
  readFileDeclaration, 
  writeFileDeclaration,
  addMemoryDeclaration,
  forgetMemoryDeclaration,
  inventoryToolDeclaration
} from "@/Backend/agent/nodes/registry";

/**
 * Node: Coder Worker
 * Specialized in local system operations, codebase analysis, and technical implementation.
 */
export async function coderWorkerNode(state: AgentStateType) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  
  const systemInstruction = `You are the Coder Worker. Your job is to handle technical tasks, codebase analysis, local operations, and DOCUMENT DRAFTING.
  
  STRICT PROTOCOLS:
  1. PRECISION MANDATE: When reading local files, report the exact content or relevant snippets. Never guess code or file structures.
  2. CODE QUALITY: Suggest idiomatic, clean, and maintainable code that follows project patterns.
  3. COLLABORATION: Use write_file to apply approved changes to the codebase. Always explain what you changed.
  4. DRAFTING: You are responsible for drafting proposals, reports, and emails. Use your high-quality reasoning to create structured, professional content.
  5. MEMORY ACCURACY: Only add facts to memory that have been explicitly confirmed by the user or verified by other workers.
  6. INVENTORY TRUTH: Report live inventory status exactly as returned by the tool.

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
  console.log(`[Agent Graph] Node: Coder Worker | Raw response text:`, response.text());

  let content = response.text();
  const toolCalls = response.functionCalls();

  // --- UI Block Validation ---
  if (content && !toolCalls?.length) {
    try {
      let cleaned = content.trim();
      if (cleaned.startsWith('```')) {
        const firstNewline = cleaned.indexOf('\n');
        if (firstNewline !== -1) cleaned = cleaned.substring(firstNewline + 1);
        if (cleaned.endsWith('```')) cleaned = cleaned.substring(0, cleaned.length - 3).trim();
      }

      const firstBracket = cleaned.indexOf('[');
      const firstBrace = cleaned.indexOf('{');
      let startIdx = -1;
      if (firstBracket !== -1 && (firstBrace === -1 || firstBracket < firstBrace)) startIdx = firstBracket;
      else if (firstBrace !== -1) startIdx = firstBrace;

      if (startIdx !== -1) {
        const lastBracket = cleaned.lastIndexOf(']');
        const lastBrace = cleaned.lastIndexOf('}');
        const endIdx = Math.max(lastBracket, lastBrace);

        if (endIdx > startIdx) {
          const jsonPotential = cleaned.substring(startIdx, endIdx + 1);
          // Assuming AgentMessageBlocksSchema and BLOCK_TYPES are available or can be imported.
          // For now, let's just parse and re-stringify if valid JSON array.
          // A more robust solution would involve importing AgentMessageBlocksSchema and BLOCK_TYPES
          // and using safeParse as in supervisorNode.
          try {
            const parsed = JSON.parse(jsonPotential);
            if (Array.isArray(parsed) && parsed.every((block: any) => block.type && typeof block.content === 'string')) {
              content = JSON.stringify(parsed);
            } else {
              content = JSON.stringify([{ type: "text", content }]);
            }
          } catch (jsonError) {
            content = JSON.stringify([{ type: "text", content }]);
          }
        }
      } else {
        content = JSON.stringify([{ type: "text", content }]);
      }
    } catch (e) {
      if (!content.startsWith('[') && !content.startsWith('{')) {
        content = JSON.stringify([{ type: "text", content }]);
      }
    }
  }

  return {
    messages: [new AIMessage({
      content: content,
      tool_calls: toolCalls,
      name: "coder_worker"
    })],
    lastWorker: NODE_NAMES.CODER_WORKER,
    metadata: { stage: STAGES.RESEARCH, status: "Coder Worker is analyzing code..." }
  };
}
