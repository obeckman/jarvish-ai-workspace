import { useState, useCallback } from 'react';

export interface AgentState {
  synthesizedContext: string;
  response: string;
  status: 'idle' | 'loading_context' | 'thinking' | 'responding' | 'error';
  error?: string;
}

export function useAgent() {
  const [state, setState] = useState<AgentState>({
    synthesizedContext: '',
    response: '',
    status: 'idle',
  });

  const askAgent = useCallback(async (query: string, googleToken?: string) => {
    setState({ synthesizedContext: '', response: '', status: 'loading_context' });

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

      setState(prev => ({ ...prev, status: 'thinking' }));

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
                status: 'responding'
              }));
            } else if (data.type === 'message') {
              // Append final execution agent response
              setState(prev => ({
                ...prev,
                response: prev.response + data.content,
                status: 'responding'
              }));
            }
          } catch (e) {
            console.error("Failed to parse chunk", line);
          }
        }
      }
      
      setState(prev => ({ ...prev, status: 'idle' }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      }));
    }
  }, []);

  return { ...state, askAgent };
}
