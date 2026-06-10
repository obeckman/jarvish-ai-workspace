import React, { useRef } from 'react';
import { 
  Send, 
  Paperclip, 
  X, 
  Square, 
  ChevronUp, 
  ChevronDown, 
  Terminal,
  Eraser
} from 'lucide-react';
import cn from 'classnames';
import styles from '@/frontend/features/jarvishAgent/jarvish-agent.module.scss';
import { Attachment } from '@/frontend/features/jarvishAgent/types';

import { ROLES ,AGENT_STATUS, STAGES, AgentStatus} from '@/shared/jarvish.constants';
import { useAutoExpand } from '../hooks/useAutoExpand';

interface JarvishChatInputProps {
  input: string;
  setInput: (input: string) => void;
  status: AgentStatus;
  statusLogs: string[];
  showAllLogs: boolean;
  setShowAllLogs: (show: boolean) => void;
  attachments: Attachment[];
  onFileUpload: (file: File) => void;
  onRemoveAttachment: (index: number) => void;
  onSendMessage: () => void;
  onCancelRequest: () => void;
  onClearInput: () => void;
}

export const JarvishChatInput: React.FC<JarvishChatInputProps> = ({
  input,
  setInput,
  status,
  statusLogs,
  showAllLogs,
  setShowAllLogs,
  attachments,
  onFileUpload,
  onRemoveAttachment,
  onSendMessage,
  onCancelRequest,
  onClearInput
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useAutoExpand(input);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileUpload(file);
      // Reset input value so same file can be selected again
      e.target.value = '';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSendMessage();
    }
  };

  const isBusy = status === AGENT_STATUS.THINKING || status === AGENT_STATUS.RESPONDING;

  return (
    <div className={styles.inputAreaWrapper}>
      {statusLogs.length > 0 && (
        <div className={cn(styles.logViewer, { [styles.expanded]: showAllLogs })}>
          <div className={styles.logHeader}>
            <div className={styles.statusWrapper}>
              <Terminal size={12} color="var(--jarvish-accent)" />
              <span className={styles.latestLog}>
                {statusLogs[statusLogs.length - 1]}
              </span>
            </div>
            <button 
              className={styles.logToggleButton} 
              onClick={() => setShowAllLogs(!showAllLogs)}
              title={showAllLogs ? "Hide Logs" : "Show Full Execution Log"}
            >
              {showAllLogs ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
            </button>
          </div>
          
          {showAllLogs && (
            <div className={styles.logList}>
              {statusLogs.map((log, i) => (
                <div key={i} className={styles.logItem}>
                  <span className={styles.logTime}>{new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit' })}</span>
                  <span>{log}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className={styles.footer}>
        {attachments.length > 0 && (
          <div className={styles.attachmentPreview}>
            {attachments.map((file, i) => (
              <div key={i} className={styles.attachmentTag}>
                <Paperclip size={12} color="var(--jarvish-accent)" />
                <span className={styles.attachmentName}>{file.name}</span>
                <button className={styles.removeBtn} onClick={() => onRemoveAttachment(i)} title="Remove attachment">
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className={styles.inputGroup}>
          <button 
            className={cn(styles.button, styles.attachButton)} 
            onClick={() => fileInputRef.current?.click()}
            title="Attach Document or Image"
            disabled={isBusy}
          >
            <Paperclip size={20} />
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            style={{ display: 'none' }} 
          />

          <textarea
            ref={textareaRef}
            className={styles.textarea}
            placeholder="Type your research request..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            disabled={isBusy}
          />

          {input.trim() && !isBusy && (
            <button className={cn(styles.button, styles.clearButton)} onClick={onClearInput} title="Clear Input">
              <Eraser size={20} />
            </button>
          )}

          {isBusy ? (
            <button className={cn(styles.button, styles.stopButton)} onClick={onCancelRequest} title="Stop Research">
              <Square size={18} fill="currentColor" />
            </button>
          ) : (
            <button 
              className={styles.button} 
              onClick={onSendMessage}
              disabled={!input.trim()}
              title="Send Message"
            >
              <Send size={18} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
