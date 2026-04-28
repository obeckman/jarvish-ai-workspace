import React from 'react';
import { 
  Loader2, 
  BrainCircuit, 
  User, 
  Bot, 
  AlertCircle,
  FileText,
  ArrowRight,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import cn from 'classnames';
import styles from '@/features/jarvishAgent/jarvish-agent.module.scss';
import { Message, Session, AgentStatus } from '@/features/jarvishAgent/types';
import { MESSAGE_ROLES, AGENT_STATUS, STAGES } from '@/features/jarvishAgent/constants';

import { ChatMessage } from './Blocks/ChatMessage';

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
  onSendMessage: (sessionId: string, queryOverride?: string) => Promise<void>;
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
  onSendMessage
}) => {
  const currentSession = sessions.find(s => s.id === currentSessionId);
  const summary = currentSession?.summary;

  // Helper to group messages (specifically reasoning steps)
  const renderMessages = () => {
    const rendered: React.ReactNode[] = [];
    let currentReasoningGroup: Message[] = [];

    const flushReasoning = () => {
      if (currentReasoningGroup.length > 0) {
        const groupId = currentReasoningGroup[0].id;
        rendered.push(
          <div key={`reasoning-group-${groupId}`} className={cn(styles.reasoningGroup, !isReasoningVisible && styles.collapsed)}>
            <div className={styles.reasoningHeader} onClick={() => setIsReasoningVisible(!isReasoningVisible)}>
              {isReasoningVisible ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              <BrainCircuit size={14} />
              <span>Thought Process ({currentReasoningGroup.length} steps)</span>
            </div>
            {isReasoningVisible && (
              <div className={styles.reasoningSteps}>
                {currentReasoningGroup.map((rm) => (
                  <div key={rm.id} className={styles.reasoningStep}>
                    <div className={styles.dot} />
                    <span>{rm.content}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
        currentReasoningGroup = [];
      }
    };

    messages.forEach((m) => {
      if (m.role === MESSAGE_ROLES.REASONING) {
        currentReasoningGroup.push(m);
      } else {
        flushReasoning();
        rendered.push(
          <ChatMessage 
            key={m.id} 
            message={m} 
            onAction={async (label) => {
              if (currentSessionId) {
                await onSendMessage(currentSessionId, label);
              }
            }} 
          />
        );
      }
    });

    flushReasoning();
    return rendered;
  };

  // Render Research Summary View
  if (!showFullConversation && currentSessionId) {
    return (
      <div className={styles.messages}>
        {summary ? (
          <div className={styles.summaryView}>
            <div className={styles.summaryCard}>
              <h3>Research Summary</h3>
              <div className={styles.summarySection}>
                <strong>Original Request</strong>
                <p>{summary.userMessage}</p>
                <button 
                  className={styles.copyBtnInline} 
                  onClick={() => onCopyToInput(summary.userMessage)}
                >
                  Reuse this query
                </button>
              </div>
              
              <div className={styles.summarySection} style={{ marginTop: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
                    <div style={{ background: 'var(--jarvish-accent)', padding: '6px', borderRadius: '8px', display: 'flex' }}>
                        <Bot size={16} color="var(--jarvish-bg)" />
                    </div>
                    <strong style={{ margin: 0, color: 'var(--jarvish-text-primary)' }}>Synthesized Findings</strong>
                </div>
                <p>{summary.aiAnswer}</p>
              </div>

              <button 
                className={styles.newChatBtn} 
                style={{ marginTop: '2rem', maxWidth: '300px' }}
                onClick={() => setShowFullConversation(true)}
              >
                Continue Research in Chat <ArrowRight size={16} />
              </button>
            </div>
          </div>
        ) : (
          <div className={styles.summaryPlaceholder}>
            <div className={styles.placeholderCard}>
              <div style={{ background: 'rgba(56, 189, 248, 0.1)', padding: '20px', borderRadius: '50%', marginBottom: '1rem', display: 'flex' }}>
                <FileText size={48} color="var(--jarvish-accent)" />
              </div>
              <h3>No summary yet</h3>
              <p>Start a conversation to generate a research summary, or switch to Chat View to see individual messages.</p>
              
              {status === AGENT_STATUS.THINKING && (
                <div className={styles.pollingStatus}>
                  <Loader2 size={16} className={styles.spin} />
                  <span>Agent is currently working...</span>
                </div>
              )}
              
              <button 
                className={styles.showFullBtnSecondary}
                onClick={() => setShowFullConversation(true)}
              >
                Switch to Chat View
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Render Full Chat View
  return (
    <div className={styles.messages}>
      {!currentSessionId ? (
        <div className={styles.summaryPlaceholder}>
           <div className={styles.placeholderCard}>
              <div style={{ background: 'rgba(56, 189, 248, 0.1)', padding: '20px', borderRadius: '50%', marginBottom: '1rem', display: 'flex' }}>
                <Bot size={48} color="var(--jarvish-accent)" />
              </div>
              <h3>Ready for Research</h3>
              <p>Select a previous session from the sidebar or start a brand new one to begin your research journey.</p>
           </div>
        </div>
      ) : (
        <>
          <div className={styles.stageTracker}>
            <div className={cn(styles.stage, { [styles.active]: currentStage === STAGES.PREPARE, [styles.completed]: currentStage > STAGES.PREPARE })} />
            <div className={cn(styles.stage, { [styles.active]: currentStage === STAGES.RESEARCH, [styles.completed]: currentStage > STAGES.RESEARCH })} />
            <div className={cn(styles.stage, { [styles.active]: currentStage === STAGES.SYNTHESIZE, [styles.completed]: currentStage > STAGES.SYNTHESIZE })} />
            <div className={cn(styles.stage, { [styles.active]: currentStage === STAGES.FINALIZE, [styles.completed]: currentStage >= STAGES.FINALIZE })} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {renderMessages()}
          </div>

          {status === AGENT_STATUS.THINKING && (
            <div className={cn(styles.message, styles.agent)}>
              <div className={styles.statusWrapper}>
                <Loader2 size={16} className={styles.spin} />
                <span className={styles.thinkingText}>{statusMessage || 'Jarvish is processing...'}</span>
              </div>
            </div>
          )}

          {errorMessage && (
            <div className={cn(styles.message, styles.errorMessageBlock)}>
              <div className={styles.errorTitle}>
                <AlertCircle size={16} />
                <span>Execution Error</span>
              </div>
              <p className={styles.messageText}>{errorMessage}</p>
            </div>
          )}
        </>
      )}
    </div>
  );
};
