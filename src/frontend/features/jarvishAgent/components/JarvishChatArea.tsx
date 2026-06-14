import React, { useRef, useEffect, useCallback } from 'react';
import {
  Loader2,
  Activity,
  Bot,
  AlertCircle,
  FileText,
  ArrowRight,
  ChevronDown,
  ChevronRight,
  Gauge
} from 'lucide-react';
import cn from 'classnames';
import styles from '@/frontend/features/jarvishAgent/jarvish-agent.module.scss';
import type { ConfidenceSummary, Message, Session } from '@/frontend/features/jarvishAgent/types';
import { ROLES ,AGENT_STATUS, STAGES, AgentStatus, BLOCK_TYPES, TOOL_CONFIDENCE_THRESHOLD} from '@/shared/jarvish.constants';
import { messageContentToPlainText } from '@/shared/messageContent';
import { ChatMessage } from './Blocks/ChatMessage';
import { Markdown } from '@/frontend/components/shared/Markdown/Markdown';
import { UI_STRINGS } from '@/frontend/features/jarvishAgent/constants';
import { EMPTY_SUMMARY_ANSWER, getSessionSummaryDisplay } from '@/frontend/features/jarvishAgent/utils/summaryDisplay';

interface JarvishChatAreaProps {
  messages: Message[];
  status: AgentStatus;
  statusMessage: string | null;
  confidenceSummary: ConfidenceSummary | null;
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
  confidenceSummary,
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
  const summaryDisplay = currentSession ? getSessionSummaryDisplay(currentSession) : null;
  const summaryUserMessage = summaryDisplay?.userMessage || messageContentToPlainText(summary?.userMessage);
  const summaryAiAnswer = summaryDisplay?.aiAnswer || EMPTY_SUMMARY_ANSWER;
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

  // Helper to group background activity messages
  const renderMessages = () => {
    const rendered: React.ReactNode[] = [];
    let currentActivityGroup: Message[] = [];

    const flushActivity = () => {
      if (currentActivityGroup.length > 0) {
        const groupId = currentActivityGroup[0].id;
        rendered.push(
          <div key={`reasoning-group-${groupId}`} className={cn(styles.reasoningGroup, !isReasoningVisible && styles.collapsed)}>
            <div className={styles.reasoningHeader} onClick={() => setIsReasoningVisible(!isReasoningVisible)}>
              {isReasoningVisible ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              <Activity size={14} />
              <span>Activity ({currentActivityGroup.length} steps)</span>
            </div>
            {isReasoningVisible && (
              <div className={styles.reasoningSteps}>
                {currentActivityGroup.map((rm) => (
                  <div key={rm.id} className={styles.reasoningStep}>
                    <div className={styles.dot} />
                    <Markdown content={typeof rm.content === 'string' ? rm.content : JSON.stringify(rm.content)} />
                  </div>
                ))}
              </div>
            )}
          </div>
        );
        currentActivityGroup = [];
      }
    };

    messages.forEach((m) => {
      if (m.type === BLOCK_TYPES.REASONING) {
        currentActivityGroup.push(m);
      } else {
        flushActivity();
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

    flushActivity(); // Ensure last activity group is flushed
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
                <p>{summaryUserMessage}</p>
                <button
                  className={styles.copyBtnInline}
                  onClick={() => onCopyToInput(summaryUserMessage)}
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
                <Markdown content={summaryAiAnswer} />
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

          <ConfidenceSummaryStrip confidenceSummary={confidenceSummary} />


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

interface ConfidenceSummaryStripProps {
  confidenceSummary: ConfidenceSummary | null;
}

const ConfidenceSummaryStrip: React.FC<ConfidenceSummaryStripProps> = ({ confidenceSummary }) => {
  if (!confidenceSummary) {
    return null;
  }

  const isLowConfidence = confidenceSummary.lowest < TOOL_CONFIDENCE_THRESHOLD;

  return (
    <div className={cn(styles.confidenceSummary, { [styles.lowConfidence]: isLowConfidence })}>
      <div className={styles.confidenceHeader}>
        <Gauge size={14} />
        <span>{UI_STRINGS.CONFIDENCE_SUMMARY_TITLE}</span>
      </div>
      <div className={styles.confidenceValues}>
        <span>{UI_STRINGS.CONFIDENCE_LATEST_LABEL}: {formatConfidencePercent(confidenceSummary.latest)}</span>
        <span>{UI_STRINGS.CONFIDENCE_LOWEST_LABEL}: {formatConfidencePercent(confidenceSummary.lowest)}</span>
      </div>
      {confidenceSummary.reason && (
        <div className={styles.confidenceReason}>
          {UI_STRINGS.CONFIDENCE_REASON_LABEL}: {confidenceSummary.reason}
        </div>
      )}
    </div>
  );
};

function formatConfidencePercent(confidence: number): string {
  return `${confidence}%`;
}
