import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, Trash2 } from 'lucide-react';
import cn from 'classnames';
import styles from './jarvish-agent.module.scss';
import { Message, AgentStatus } from './types';

const INITIAL_MESSAGE: Message = {
  id: '1',
  role: 'agent',
  content: 'Hello! I am Jarvish, your personal agent. How can I help you today?',
  timestamp: Date.now(),
};

export const JarvishAgent: React.FC = () => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [status, setStatus] = useState<AgentStatus>('idle');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([INITIAL_MESSAGE]);
  }, []);

  const sendMessage = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || status !== 'idle') return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setStatus('thinking');

    try {
      // Simulation of API call or real call if available
      const response = await fetch('http://localhost:3000/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input }),
      });

      if (!response.ok) {
        throw new Error('Failed to connect to agent');
      }

      const data = await response.json();
      
      const agentMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'agent',
        content: data.reply || "I'm sorry, I couldn't process that.",
        timestamp: Date.now(),
      };

      setStatus('responding');
      setTimeout(() => {
        setMessages((prev) => [...prev, agentMessage]);
        setStatus('idle');
      }, 500);

    } catch (error) {
      console.error('Agent error:', error);
      setStatus('error');
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'agent',
        content: "I'm having trouble connecting right now. Please make sure the agent server is running.",
        timestamp: Date.now(),
      };
      
      setMessages((prev) => [...prev, errorMessage]);
      setTimeout(() => setStatus('idle'), 2000);
    }
  }, [input, status]);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <Bot size={24} />
        <h2>Jarvish Agent</h2>
        <button 
          onClick={clearMessages} 
          className={styles.button} 
          style={{ marginLeft: 'auto', background: 'transparent', padding: '4px' }}
          title="Clear Chat"
        >
          <Trash2 size={18} />
        </button>
      </header>

      <div className={styles.messages}>
        {messages.map((msg) => (
          <div 
            key={msg.id} 
            className={cn(styles.message, {
              [styles.user]: msg.role === 'user',
              [styles.agent]: msg.role === 'agent'
            })}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
              <strong style={{ fontSize: '0.75rem' }}>
                {msg.role === 'user' ? 'You' : 'Jarvish'}
              </strong>
            </div>
            {msg.content}
          </div>
        ))}
        {status === 'thinking' && (
          <div className={cn(styles.message, styles.agent)}>
            <Loader2 className={styles.loading} size={18} />
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <footer className={styles.footer}>
        <form onSubmit={sendMessage} className={styles.inputGroup}>
          <input
            type="text"
            className={styles.input}
            placeholder="Type your message..."
            value={input}
            onChange={handleInputChange}
            disabled={status !== 'idle'}
          />
          <button 
            type="submit" 
            className={styles.button}
            disabled={!input.trim() || status !== 'idle'}
          >
            {status === 'thinking' ? <Loader2 className={styles.loading} size={18} /> : <Send size={18} />}
          </button>
        </form>
        {status !== 'idle' && (
          <div className={styles.status}>
            {status === 'thinking' && <span>Jarvish is thinking...</span>}
            {status === 'responding' && <span>Jarvish is typing...</span>}
            {status === 'error' && <span style={{ color: '#ef4444' }}>Connection Error</span>}
          </div>
        )}
      </footer>
    </div>
  );
};

export default JarvishAgent;
