import React, { useRef, useEffect, useCallback } from 'react';
import {
  Loader2,
  BrainCircuit,
  Bot,
  AlertCircle,
  FileText,
  ArrowRight,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import cn from 'classnames';
import styles from '@/features/jarvishAgent/jarvish-agent.module.scss';
import { Message, Session } from '@/features/jarvishAgent/types';
import { ROLES ,AGENT_STATUS, STAGES, AgentStatus, BLOCK_TYPES} from '@/shared/jarvish.constants';
import { ChatMessage } from './Blocks/ChatMessage';
import { Markdown } from '@/components/shared/Markdown/Markdown';

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
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, status, scrollToBottom]);

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
                    <Markdown content={typeof rm.content === 'string' ? rm.content : JSON.stringify(rm.content)} />
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
      console.log(`[JarvishChatArea] Rendering message:`, m);
      if (m.type === BLOCK_TYPES.REASONING) {
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

    flushReasoning(); // Ensure last reasoning group is flushed
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

              <div className={cn(styles.summarySection, styles.summarySectionSpaced)}>
                <div className={styles.summaryHeadingRow}>
                  <div className={styles.summaryIconSmall}>
                    <Bot size={16} />
                  </div>
                  <strong className={styles.summaryHeading}>Synthesized Findings</strong>
                </div>
                <Markdown content={summary.aiAnswer} />
              </div>

              <button
                className={cn(styles.newChatBtn, styles.summaryActionButton)}
                onClick={() => setShowFullConversation(true)}
              >
                Continue Research in Chat <ArrowRight size={16} />
              </button>
            </div>
          </div>
        ) : (
          <div className={styles.summaryPlaceholder}>
            <div className={styles.placeholderCard}>
              <div className={styles.placeholderIconCircle}>
                <FileText size={48} />
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
    <div className={styles.messages} ref={scrollContainerRef}>
      {!currentSessionId ? (
        <div className={styles.summaryPlaceholder}>
          <div className={styles.placeholderCard}>
            <div className={styles.placeholderIconCircle}>
              <Bot size={48} />
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

          <div className={styles.messageList}>
            {renderMessages()}
          </div>
        </>
      )}
    </div>
  );
};
