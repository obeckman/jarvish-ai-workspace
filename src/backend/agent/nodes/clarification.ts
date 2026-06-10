import { GoogleGenerativeAI } from "@google/generative-ai";
import { AgentStateType } from "@/Backend/agent/state";
import { REASONING_MODEL } from "@/Backend/agent/models";
import { BLOCK_TYPES, STAGES } from "@/shared/jarvish.constants";;
import { mapStateToGeminiHistory } from "./utils";
import { AIMessage } from "@langchain/core/messages";
import { logger } from "@/Backend/utils/logger";
import {
  formatConfidenceStatus,
  validateOrRepairNodeResponse,
} from "@/Backend/agent/validation/node-response.validator";

/**
 * Node: Clarification
 * Responsibilities:
 * 1. Invoked when a tool returns a low confidence score (< 70%).
 * 2. Analyzes the failure or ambiguity and directly asks the user for clarification.
 * 3. Prevents the agent from "guessing" or hallucinating data.
 */
export async function clarificationNode(state: AgentStateType) {
  logger.debug({ sessionId: state.sessionId, messagesCount: state.messages.length }, "Node: Clarification");
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  
  const systemInstruction = `You are the Jarvish Clarification Agent. A recent tool execution returned a low confidence score, meaning the team lacks the information needed to proceed accurately.
  
  YOUR PROTOCOL:
  1. Explain to the user what you were trying to do.
  2. Explain why it failed or was ambiguous.
  3. Ask a direct, concise question to the user to get the missing information.
  4. DO NOT attempt to answer the original query.
  
  OUTPUT MANDATE:
  - You MUST use a JSON array of UI blocks.
  - E.g., [{ "type": "${BLOCK_TYPES.TEXT}", "content": "I tried searching for X, but couldn't find a definitive answer. Could you clarify Y?" }]
  `;

  const model = genAI.getGenerativeModel({
    model: REASONING_MODEL,
    systemInstruction,
  });

  const history = mapStateToGeminiHistory(state);
  const lastMsg = history.pop();
  
  if (!lastMsg) throw new Error("No messages found for Clarification Node.");

  const chat = model.startChat({ history });
  const result = await chat.sendMessage(lastMsg.parts);
  const response = result.response;
  
  let content = response.text();
  const validation = await validateOrRepairNodeResponse(content, async (repairPrompt) => {
    logger.warn({ sessionId: state.sessionId }, "Clarification response failed validation; requesting repair");
    const repairResult = await chat.sendMessage(repairPrompt);
    return repairResult.response.text();
  });
  
  content = validation.content;
  
  return {
    messages: [new AIMessage({
      content: content,
      name: "clarification_agent"
    })],
    metadata: {
      stage: STAGES.SYNTHESIZE,
      status: formatConfidenceStatus("Awaiting user clarification...", validation.confidence, validation.reason),
      confidence: validation.confidence,
      validationReason: validation.reason,
    },
    toolConfidence: null // Reset for the next run
  };
}
