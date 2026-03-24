import React, { useState, useCallback } from 'react';
import { useAgent } from '../../hooks/useAgent';
import { Send, Bot, User, Loader2, BrainCircuit, Activity } from 'lucide-react';
import cn from 'classnames';
import styles from './jarvish-agent.module.scss';

export const ContextAwareAgent: React.FC = () => {
  const [query, setQuery] = useState('');
  const { synthesizedContext, response, status, error, askAgent } = useAgent();

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || status !== 'idle') return;
    askAgent(query);
    setQuery('');
  }, [query, status, askAgent]);

  return (
    <div className={styles.container} style={{ height: '700px' }}>
      <header className={styles.header}>
        <BrainCircuit size={24} />
        <h2>Context-Aware Agent (Thought Trace)</h2>
      </header>

      <div className={styles.messages}>
        {/* Thought Trace Pattern: Show synthesized context before final answer */}
        {synthesizedContext && (
          <div className={cn(styles.message, styles.agent)} style={{ borderLeft: '4px solid #10b981', background: '#f0fdf4' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: '#059669' }}>
              <Activity size={14} />
              <strong style={{ fontSize: '0.75rem' }}>Synthesized Context (Memory + Entities)</strong>
            </div>
            <p style={{ margin: 0, fontStyle: 'italic', fontSize: '0.8rem' }}>
              {synthesizedContext}
            </p>
          </div>
        )}

        {response && (
          <div className={cn(styles.message, styles.agent)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <Bot size={14} />
              <strong style={{ fontSize: '0.75rem' }}>Jarvish Execution Agent</strong>
            </div>
            <p style={{ margin: 0 }}>{response}</p>
          </div>
        )}

        {status !== 'idle' && status !== 'error' && !response && (
          <div className={cn(styles.message, styles.agent)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Loader2 className={styles.loading} size={18} />
              <span>
                {status === 'loading_context' && 'Retrieving Memories...'}
                {status === 'thinking' && 'Orchestrating Context...'}
                {status === 'responding' && 'Executing Task...'}
              </span>
            </div>
          </div>
        )}

        {error && (
          <div className={cn(styles.message, styles.agent)} style={{ background: '#fef2f2', color: '#dc2626' }}>
            <strong>Error:</strong> {error}
          </div>
        )}
      </div>

      <footer className={styles.footer}>
        <form onSubmit={handleSubmit} className={styles.inputGroup}>
          <input
            type="text"
            className={styles.input}
            placeholder="Ask about inventory (e.g., 'Do we have SHOE-123 in stock?')"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={status !== 'idle'}
          />
          <button 
            type="submit" 
            className={styles.button}
            disabled={!query.trim() || status !== 'idle'}
          >
            {status !== 'idle' ? <Loader2 className={styles.loading} size={18} /> : <Send size={18} />}
          </button>
        </form>
      </footer>
    </div>
  );
};
