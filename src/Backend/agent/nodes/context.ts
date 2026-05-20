import { AgentStateType } from "@/Backend/agent/state";
import { retrieveMemories } from "@/Backend/services/memory/memory.service";
import { ROLES, STAGES } from "@/shared/jarvish.constants";
import { AIMessage } from "@langchain/core/messages";
import { logger } from "@/Backend/utils/logger";

/**
 * Node: Context Retrieval
 * Responsibilities:
 * 1. Extract the primary query from the last user message.
 * 2. Perform a semantic search in Weaviate for relevant history.
 * 3. Update the state with retrieved memories and stage progress.
 */
export async function contextNode(state: AgentStateType) {
  logger.debug({ sessionId: state.sessionId, messagesCount: state.messages.length }, "Node: Context");
  const lastMessage = state.messages[state.messages.length - 1];
  const query = typeof lastMessage.content === 'string' ? lastMessage.content : "Summarize interaction";

  // Stage 1: Preparation / Memory Retrieval
  logger.info({ sessionId: state.sessionId, query }, "Retrieving memories for query");

  const memories = await retrieveMemories(query, 5);
  logger.debug({ sessionId: state.sessionId, retrievedMemoriesCount: memories.length }, "Retrieved memories");
  return {
    memories: memories,
    messages: [
      new AIMessage({
        name: ROLES.REASONING,
        content: `Retrieved ${memories.length} relevant memories from long-term storage.`
      })
    ],
    metadata: { 
      stage: STAGES.PREPARE, 
      status: `Retrieved ${memories.length} relevant memories from vector DB. Confidence: 100%.`,
      confidence: 100,
      validationReason: "Context node completed memory retrieval.",
    }
  };
}
