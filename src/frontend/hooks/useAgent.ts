import { useState, useCallback } from 'react';
import { EVENT_TYPES ,AGENT_STATUS, AgentStatus} from '@/shared/jarvish.constants';
export interface AgentState {
  synthesizedContext: string;
  response: string;
  status: AgentStatus;
  error?: string;
}

export function useAgent() {
  const [state, setState] = useState<AgentState>({
    synthesizedContext: '',
    response: '',
    status: AGENT_STATUS.IDLE,
  });

  const askAgent = useCallback(async (query: string, googleToken?: string) => {
    setState({ synthesizedContext: '', response: '', status: AGENT_STATUS.THINKING });

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (googleToken) {
        headers['x-google-token'] = googleToken;
      }

      // Assuming a backend endpoint that streams NDJSON (Newline Delimited JSON)
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers,
        body: JSON.stringify({ query }),
      });

      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder('utf-8');

      setState(prev => ({ ...prev, status: AGENT_STATUS.THINKING }));

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunkText = decoder.decode(value, { stream: true });
        const lines = chunkText.split('\n').filter(line => line.trim() !== '');

        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            
            if (data.type === 'context') {
              // Show Thought Trace (Synthesized Context)
              setState(prev => ({
                ...prev,
                synthesizedContext: data.content,
                status: AGENT_STATUS.RESPONDING
              }));
            } else if (data.type === EVENT_TYPES.MESSAGE) {
              // Append final execution agent response
              setState(prev => ({
                ...prev,
                response: prev.response + data.content,
                status: AGENT_STATUS.RESPONDING
              }));
            }
          } catch (e) {
            console.error("Failed to parse chunk", line);
          }
        }
      }
      
      setState(prev => ({ ...prev, status: AGENT_STATUS.IDLE }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        status: AGENT_STATUS.ERROR,
        error: error instanceof Error ? error.message : 'Unknown error'
      }));
    }
  }, []);

  return { ...state, askAgent };
}
