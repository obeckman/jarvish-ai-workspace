import { AgentStateType } from "../state.js";
import { addMemory } from "../../services/memory/memory.service.js";

/**
 * Node: Memory Archiving
 * Responsibilities:
 * 1. Summarize the current interaction.
 * 2. Persist the summary to Weaviate for long-term recall.
 */
export async function archiveNode(state: AgentStateType) {
  const lastUserMessage = state.messages.findLast(m => m.role === 'user');
  const lastModelMessage = state.messages.findLast(m => m.role === 'assistant' || (m.role === 'model' && !m.tool_calls));

  if (lastUserMessage && lastModelMessage) {
    console.log(`[Agent Graph] Node: Archive | Saving interaction to memory.`);
    
    const summary = `Conversation Summary [${new Date().toLocaleTimeString()}]:
    User: ${lastUserMessage.content}
    Assistant: ${lastModelMessage.content}`;

    await addMemory(summary, { 
      type: 'history', 
      timestamp: new Date().toISOString() 
    }).catch(err => console.error("[Archive Node Error]", err));
  }

  return {
    metadata: { stage: 4, status: "Jarvish has remembered this session." }
  };
}
