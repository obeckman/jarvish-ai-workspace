import React, { useRef, useEffect } from 'react';
import { User, Bot, BrainCircuit, ChevronUp, ChevronDown, Plus, AlertCircle, Loader2, History } from 'lucide-react';
import cn from 'classnames';
import styles from '@/features/jarvishAgent/jarvish-agent.module.scss';
import { Message, Session, AgentStatus } from '@/features/jarvishAgent/types';
import { MESSAGE_ROLES, AGENT_STATUS, STAGES } from '@/features/jarvishAgent/constants';

interface JarvishChatAreaProps {
  messages: Message[];
  status: AgentStatus;
  statusMessage: string | null;
  errorMessage: string | null;
  currentStage: number;
  isReasoningVisible: boolean;
  setIsReasoningVisible: (visible: boolean) => void;
  showFullConversation: boolean;
  setShowFullConversation: (show: boolean) => void;
  currentSessionId: string | null;
  sessions: Session[];
  onCopyToInput: (text: string) => void;
}

export const JarvishChatArea: React.FC<JarvishChatAreaProps> = ({
  messages,
  status,
  statusMessage,
  errorMessage,
  currentStage,
  isReasoningVisible,
  setIsReasoningVisible,
  showFullConversation,
  setShowFullConversation,
  currentSessionId,
  sessions,
  onCopyToInput,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, errorMessage, status]);

  const activeSession = sessions.find(s => s.id === currentSessionId);

  if (!showFullConversation && currentSessionId) {
    return (
      <div className={styles.messages}>
        <div className={styles.summaryView}>
          {activeSession?.summary ? (
            <div className={styles.summaryCard}>
              <h3>{activeSession.summary.summaryTitle}</h3>
              <div className={styles.summarySection}>
                <strong>Original Request:</strong>
                <p>{activeSession.summary.userMessage}</p>
                <button onClick={() => onCopyToInput(activeSession.summary?.userMessage || '')} className={styles.copyBtnInline}>
                  Copy to input
                </button>
              </div>
              <div className={styles.summarySection}>
                <strong>Key Findings:</strong>
                <p>{activeSession.summary.aiAnswer}</p>
              </div>
              <button onClick={() => setShowFullConversation(true)} className={styles.showFullBtn}>
                View Full Conversation
              </button>
            </div>
          ) : (
            <div className={styles.summaryPlaceholder}>
              <div className={styles.placeholderCard}>
                <History size={48} color="#94a3b8" />
                <h3>Summary is being prepared</h3>
                <p>Jarvish is analyzing this conversation to provide a concise overview. This will take just a few seconds.</p>
                <div className={styles.pollingStatus}>
                  <Loader2 size={16} className={styles.spin} />
                  <span>Checking for summary...</span>
                </div>
                <button onClick={() => setShowFullConversation(true)} className={styles.showFullBtnSecondary}>
                  Skip to Full Conversation
                </button>
              </div>
            </div>
          )}
        </div>
        <div ref={messagesEndRef} />
      </div>
    );
  }

  return (
    <div className={styles.messages}>
      {status !== AGENT_STATUS.IDLE && (
        <div className={styles.stageTracker}>
          {[
            { id: STAGES.PREPARE, label: 'Prepare' },
            { id: STAGES.RESEARCH, label: 'Research' },
            { id: STAGES.SYNTHESIZE, label: 'Synthesize' },
            { id: STAGES.FINALIZE, label: 'Finalize' }
          ].map((stage) => (
            <div key={stage.id} className={cn(styles.stage, { 
              [styles.active]: currentStage === stage.id,
              [styles.completed]: currentStage > stage.id 
            })}>
              <div className={styles.dot} />
              <span>{stage.label}</span>
            </div>
          ))}
        </div>
      )}

      {(() => {
        const elements: React.ReactNode[] = [];
        let reasoningGroup: Message[] = [];

        const flushReasoning = () => {
          if (reasoningGroup.length > 0) {
            const group = [...reasoningGroup];
            const isCollapsed = !isReasoningVisible;
            
            elements.push(
              <div key={`reason-group-${group[0].id}`} className={cn(styles.reasoningGroup, { [styles.collapsed]: isCollapsed })}>
                <div className={styles.reasoningHeader} onClick={() => setIsReasoningVisible(!isReasoningVisible)}>
                  <BrainCircuit size={12} />
                  <span>{isCollapsed ? `Show Thought Process (${group.length} steps)` : 'Hide Thought Process'}</span>
                  {isCollapsed ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </div>
                {!isCollapsed && (
                  <div className={styles.reasoningSteps}>
                    {group.map(rm => (
                      <div key={rm.id} className={styles.reasoningStep}>
                        <div className={styles.dot} />
                        {rm.content}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
            reasoningGroup = [];
          }
        };

        messages.forEach((msg) => {
          const isUser = msg.role === MESSAGE_ROLES.USER;
          const isAgent = msg.role === MESSAGE_ROLES.AGENT;
          const isReasoning = msg.role === MESSAGE_ROLES.REASONING;

          if (isReasoning) {
            reasoningGroup.push(msg);
          } else {
            flushReasoning();
            if (msg.content === '' && (isUser || isAgent)) return;

            elements.push(
              <div key={msg.id} className={cn(styles.message, { [styles.user]: isUser, [styles.agent]: isAgent })}>
                <div className={styles.messageHeader}>
                  <div className={styles.messageSender}>
                    {isUser ? <User size={12} /> : <Bot size={12} />}
                    <strong className={styles.senderName}>{isUser ? 'You' : 'Jarvish'}</strong>
                  </div>
                  {isUser && (
                    <button 
                      onClick={() => onCopyToInput(msg.content)} 
                      className={styles.copyIconBtn}
                      title="Copy to prompt"
                    >
                      <Plus size={12} />
                    </button>
                  )}
                </div>
                <div style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>
              </div>
            );
          }
        });
        
        flushReasoning();
        return elements;
      })()}

      {errorMessage && (
        <div className={cn(styles.message, styles.agent, styles.errorMessageBlock)}>
          <div className={styles.errorTitle}>
            <AlertCircle size={14} /> System Error
          </div>
          {errorMessage}
        </div>
      )}

      {status === AGENT_STATUS.THINKING && !errorMessage && (
        <div className={cn(styles.message, styles.agent)}>
          <div className={styles.messageSender}>
            <Loader2 className={styles.loading} size={18} />
            <span className={styles.thinkingText}>
              {statusMessage || 'Jarvish is processing...'}
            </span>
          </div>
        </div>
      )}
      <div ref={messagesEndRef} />
    </div>
  );
};
