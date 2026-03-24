import React, { useState, useCallback } from 'react';
import { Bot, Send, Loader2, Sparkles } from 'lucide-react';
import { useAgent } from '../../hooks/useAgent';
import styles from './AgentChat.module.scss';

export const AgentChat: React.FC = () => {
  const [query, setQuery] = useState('');
  const { response, synthesizedContext, status, error, askAgent } = useAgent();

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || status !== 'idle') return;
    
    await askAgent(query);
    setQuery('');
  }, [query, status, askAgent]);

  const isLoading = status !== 'idle';

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>
        <Bot className={styles.icon} />
        Context-Aware AI Agent
      </h2>

      <form onSubmit={handleSubmit} className={styles.inputGroup}>
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          placeholder="Ask the agent something..."
          className={styles.input}
          disabled={isLoading}
        />
        <button 
          type="submit" 
          className={styles.button}
          disabled={isLoading || !query.trim()}
        >
          {isLoading ? (
            <Loader2 className={styles.spinner} size={20} />
          ) : (
            <Send size={20} />
          )}
          {isLoading ? 'Thinking...' : 'Send'}
        </button>
      </form>

      {synthesizedContext && (
        <div className={styles.thoughtTrace}>
          <h4>
            <Sparkles size={14} style={{ marginRight: '4px' }} />
            Synthesized Context (Thought Trace)
          </h4>
          <p>{synthesizedContext}</p>
        </div>
      )}

      <div className={styles.responseArea}>
        {response ? (
          <div>{response}</div>
        ) : (
          !isLoading && <div className={styles.placeholder}>Response will appear here...</div>
        )}
        
        {isLoading && status === 'thinking' && !response && (
          <div className={styles.placeholder}>Agent is thinking...</div>
        )}
      </div>

      {error && (
        <div className={styles.error}>
          <strong>Error:</strong> {error}
        </div>
      )}
    </div>
  );
};
