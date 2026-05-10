import { GoogleGenerativeAI } from "@google/generative-ai";
import { AgentStateType } from "@/Backend/agent/state";
import { ROLES, GEMINI_ROLES } from "@/shared/jarvish.constants";



/**
 * Safely extracts the role from a message (BaseMessage or raw object).
 */
export function getMessageRole(m: any): string {
  if (!m) return "";
  return (m.role || m.lc_kwargs?.role || (typeof m._getType === 'function' ? m._getType() : m.type) || "").toLowerCase();
}

/**
 * Safely extracts the type from a message (BaseMessage or raw object).
 */
export function getMessageType(m: any): string {
  if (!m) return "";
  return (typeof m._getType === 'function' ? m._getType() : (m.type || "")).toLowerCase();
}

/**
 * Maps LangGraph state messages to Gemini API history format.
 */
export function mapStateToGeminiHistory(state: AgentStateType) {
  let history = state.messages
    .filter(m => {
      const r = getMessageRole(m);
      // Filter out UI-only roles that the LLM shouldn't see
      return r !== ROLES.REASONING;
    })
    .map(m => {
      const r = getMessageRole(m);
      const t = getMessageType(m);

      let role: string = GEMINI_ROLES.MODEL; 
      if (r === ROLES.USER || r === ROLES.HUMAN ) {
        role = GEMINI_ROLES.USER;
      } else if (r === ROLES.TOOL || r === ROLES.FUNCTION) {
        role = GEMINI_ROLES.FUNCTION;
      }

      const parts: any[] = [];
      const toolCalls = (m as any).tool_calls;
      
      if (toolCalls && toolCalls.length > 0) {
        // Filter out delegation tools as they don't have real execution results
        const realToolCalls = toolCalls.filter((tc: any) => 
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
          parts.push({ text: String(m.content) });
        }
      } else if (role === GEMINI_ROLES.FUNCTION) {
        parts.push({
          functionResponse: {
            name: (m as any).name || 'unknown_tool', 
            response: { result: m.content }
          }
        });
      } else if (m.content) {
        const content = typeof m.content === 'string' 
          ? m.content 
          : JSON.stringify(m.content);
        parts.push({ text: content });
      } else if (role === GEMINI_ROLES.USER) {
        parts.push({ text: "" });
      }

      return { role, parts };
    })
    .filter(m => m.parts.length > 0);

  // Gemini Requirement: History must start with a 'USER' message.
  const firstUserIndex = history.findIndex(m => m.role === GEMINI_ROLES.USER);
  if (firstUserIndex !== -1) {
    history = history.slice(firstUserIndex);
  }

  return history;
}
