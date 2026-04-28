import { GoogleGenerativeAI } from "@google/generative-ai";
import { AgentStateType } from "@/server_v2/agent/state";
import { ROLES } from "@/server_v2/agent/constants";

// Gemini API specific role strings
export const GEMINI_ROLES = {
  USER: 'user',
  MODEL: 'model',
  FUNCTION: 'function',
} as const;

/**
 * Maps LangGraph state messages to Gemini API history format.
 */
export function mapStateToGeminiHistory(state: AgentStateType) {
  let history = state.messages
    .filter(m => {
      const r = (m.role || "").toLowerCase();
      // Filter out UI-only roles that the LLM shouldn't see
      return r !== ROLES.REASONING.toLowerCase();
    })
    .map(m => {
      const r = (m.role || "").toLowerCase();
      const t = (m.type || "").toLowerCase();

      let role: string = GEMINI_ROLES.MODEL; 
      if (r === ROLES.USER.toLowerCase() || r === ROLES.HUMAN.toLowerCase() || t === ROLES.HUMAN.toLowerCase()) {
        role = GEMINI_ROLES.USER;
      } else if (r === ROLES.TOOL.toLowerCase() || r === ROLES.FUNCTION.toLowerCase() || t === ROLES.TOOL.toLowerCase()) {
        role = GEMINI_ROLES.FUNCTION;
      }

      const parts: any[] = [];
      if (m.tool_calls && m.tool_calls.length > 0) {
        // Filter out delegation tools as they don't have real execution results
        const realToolCalls = m.tool_calls.filter((tc: any) => 
          !tc.name.startsWith('delegate_to_')
        );

        if (realToolCalls.length > 0) {
          parts.push(...realToolCalls.map((tc: any) => ({
            functionCall: {
              name: tc.name,
              args: tc.args
            }
          })));
        } else if (m.content) {
          // If it only had delegation calls, treat it as a text message or skip
          parts.push({ text: m.content });
        }
      } else if (role === GEMINI_ROLES.FUNCTION) {
        parts.push({
          functionResponse: {
            name: m.name || 'unknown_tool', 
            response: { result: m.content }
          }
        });
      } else if (m.content || m.text) {
        parts.push({ text: m.content || m.text });
      } else if (role === GEMINI_ROLES.USER) {
        parts.push({ text: "" });
      }

      return { role, parts };
    })
    .filter(m => m.parts.length > 0);

  // Gemini Requirement: History must start with a 'user' message.
  const firstUserIndex = history.findIndex(m => m.role === GEMINI_ROLES.USER);
  if (firstUserIndex !== -1) {
    history = history.slice(firstUserIndex);
  }

  return history;
}
