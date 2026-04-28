import React, { useState, useCallback } from 'react';
import { useAgent } from '@/hooks/useAgent';
import { Send, Bot, User, Loader2, BrainCircuit, Activity } from 'lucide-react';
import cn from 'classnames';
import styles from '@/features/jarvishAgent/jarvish-agent.module.scss';
import { UI_STRINGS, AGENT_STATUS } from '@/features/jarvishAgent/constants';
import { Markdown } from '@/components/shared/Markdown/Markdown';

export const ContextAwareAgent: React.FC = () => {
  const [query, setQuery] = useState('');
  const { synthesizedContext, response, status, error, askAgent } = useAgent();

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || status !== AGENT_STATUS.IDLE) return;
    askAgent(query);
    setQuery('');
  }, [query, status, askAgent]);

  return (
    <div className={cn(styles.container, styles.agentContainer)}>
      <header className={styles.header}>
        <BrainCircuit size={24} />
        <h2>Context-Aware Agent (Thought Trace)</h2>
      </header>

      <div className={styles.messages}>
        {/* Thought Trace Pattern: Show synthesized context before final answer */}
        {synthesizedContext && (
          <div className={cn(styles.message, styles.agent, styles.synthesizedContextBlock)}>
            <div className={styles.synthesizedContextHeader}>
              <Activity size={14} />
              <strong className={styles.agentName}>Synthesized Context (Memory + Entities)</strong>
            </div>
            <Markdown content={synthesizedContext} className={styles.synthesizedContextText} />
          </div>
        )}

        {response && (
          <div className={cn(styles.message, styles.agent)}>
            <div className={styles.agentMessageHeader}>
              <Bot size={14} />
              <strong className={styles.agentName}>Jarvish Execution Agent</strong>
            </div>
            <Markdown content={response} className={styles.messageText} />
          </div>
        )}

        {status !== AGENT_STATUS.IDLE && status !== AGENT_STATUS.ERROR && !response && (
          <div className={cn(styles.message, styles.agent)}>
            <div className={styles.statusWrapper}>
              <Loader2 className={styles.loading} size={18} />
              <span>
                {status === 'loading_context' && UI_STRINGS.STATUS_RETRIEVING}
                {status === 'thinking' && UI_STRINGS.STATUS_ORCHESTRATING}
                {status === 'responding' && UI_STRINGS.STATUS_EXECUTING}
              </span>
            </div>
          </div>
        )}

        {error && (
          <div className={cn(styles.message, styles.agent, styles.errorMessageText)}>
            <strong>Error:</strong> {error}
          </div>
        )}
      </div>

      <footer className={styles.footer}>
        <form onSubmit={handleSubmit} className={styles.inputGroup}>
          <input
            type="text"
            className={styles.input}
            placeholder={UI_STRINGS.CONTEXT_AGENT_PLACEHOLDER}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={status !== AGENT_STATUS.IDLE}
          />
          <button 
            type="submit" 
            className={styles.button}
            disabled={!query.trim() || status !== AGENT_STATUS.IDLE}
          >
            {status !== AGENT_STATUS.IDLE ? <Loader2 className={styles.loading} size={18} /> : <Send size={18} />}
          </button>
        </form>
      </footer>
    </div>
  );
};
