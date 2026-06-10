import { logger } from "@/Backend/utils/logger";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { AgentStateType } from "@/Backend/agent/state";
import { REASONING_MODEL } from "@/Backend/agent/models";
import { STAGES, NODE_NAMES } from "@/shared/jarvish.constants";
import { mapStateToGeminiHistory } from "../utils";
import { AIMessage } from "@langchain/core/messages";
import { 
  readFileDeclaration, 
  writeFileDeclaration,
  addMemoryDeclaration,
  forgetMemoryDeclaration,
  inventoryToolDeclaration
} from "@/Backend/agent/nodes/registry";
import {
  createClarificationBlockContent,
  formatConfidenceStatus,
  validateOrRepairNodeResponse,
} from "@/Backend/agent/validation/node-response.validator";

/**
 * Node: Coder Worker
 * Specialized in local system operations, codebase analysis, and technical implementation.
 */
export async function coderWorkerNode(state: AgentStateType) {
  logger.debug({ sessionId: state.sessionId, messagesCount: state.messages.length }, "Node: Coder Worker");
  try {
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
          readFileDeclaration,
          writeFileDeclaration,
          addMemoryDeclaration,
          forgetMemoryDeclaration,
          inventoryToolDeclaration
        ]
      }]
    });

    const history = mapStateToGeminiHistory(state);
    const lastMsg = history.pop();
    
    if (!lastMsg) throw new Error("No messages found for Coder Worker.");

    const chat = model.startChat({ history });
    const result = await chat.sendMessage(lastMsg.parts);
    const response = result.response;
    logger.debug({ sessionId: state.sessionId, rawResponse: response.text() }, "Coder Worker | Raw response text");

    let content = response.text();
    const toolCalls = response.functionCalls();
    let confidence = toolCalls?.length ? 100 : 0;
    let validationReason = toolCalls?.length
      ? "Coder Worker returned tool calls."
      : "Coder Worker response has not been validated yet.";

    if (content && !toolCalls?.length) {
      const validation = await validateOrRepairNodeResponse(content, async (repairPrompt) => {
        logger.warn({ sessionId: state.sessionId }, "Coder Worker response failed validation; requesting repair");
        const repairResult = await chat.sendMessage(repairPrompt);
        return repairResult.response.text();
      });

      content = validation.content;
      confidence = validation.confidence;
      validationReason = validation.reason;
    } else if (toolCalls?.length) {
      logger.debug({ sessionId: state.sessionId, toolCallsCount: toolCalls.length }, "Coder Worker requested tools");
    } else {
      content = createClarificationBlockContent("Coder Worker returned no content and no tool calls.");
      confidence = 0;
      validationReason = "Coder Worker returned no content and no tool calls.";
    }

    return {
      messages: [new AIMessage({
        content: content,
        tool_calls: toolCalls,
        name: "coder_worker"
      })],
      lastWorker: NODE_NAMES.CODER_WORKER,
      metadata: {
        stage: STAGES.RESEARCH,
        status: formatConfidenceStatus("Coder Worker is analyzing code...", confidence, validationReason),
        confidence,
        validationReason,
      }
    };
  } catch (error) {
    logger.error({ sessionId: state.sessionId, error }, "Node: Coder Worker | Error during processing");
    throw error;
  }
}
