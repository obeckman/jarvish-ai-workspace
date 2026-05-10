import { AgentStateType } from "@/Backend/agent/state";
import { retrieveMemories } from "@/Backend/services/memory/memory.service";
import { ROLES, STAGES } from "@/shared/jarvish.constants";
import { AIMessage } from "@langchain/core/messages";

/**
 * Node: Context Retrieval
 * Responsibilities:
 * 1. Extract the primary query from the last user message.
 * 2. Perform a semantic search in Weaviate for relevant history.
 * 3. Update the state with retrieved memories and stage progress.
 */
export async function contextNode(state: AgentStateType) {
  //console.log(`[Agent Graph] Node: Context | State messages param:`, state.messages);
  const lastMessage = state.messages[state.messages.length - 1];
  const query = typeof lastMessage.content === 'string' ? lastMessage.content : "Summarize interaction";

  // Stage 1: Preparation / Memory Retrieval
  console.log(`[Agent Graph] Node: Context | Retrieving memories for query.`);
  
  const memories = await retrieveMemories(query, 5);
  //console.log(`[Agent Graph] Node: Context | Retrieved ${memories.length} memories.`, memories);
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
      status: `Retrieved ${memories.length} relevant memories from vector DB.` 
    }
  };
}
