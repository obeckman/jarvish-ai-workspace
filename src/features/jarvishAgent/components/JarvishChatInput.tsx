import React, { useRef, useEffect, useCallback } from 'react';
import { Paperclip, X, Square, Send, ChevronDown, List } from 'lucide-react';
import cn from 'classnames';
import styles from '@/features/jarvishAgent/jarvish-agent.module.scss';
import { Attachment, AgentStatus } from '@/features/jarvishAgent/types';
import { AGENT_STATUS } from '@/features/jarvishAgent/constants';

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
  onSendMessage: (e?: React.FormEvent) => void;
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
  onClearInput,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const adjustTextareaHeight = useCallback(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, []);

  useEffect(() => {
    adjustTextareaHeight();
  }, [input, adjustTextareaHeight]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach(onFileUpload);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className={styles.inputAreaWrapper}>
      {statusLogs.length > 0 && (
        <div className={cn(styles.logViewer, { [styles.expanded]: showAllLogs })}>
          <div className={styles.logHeader}>
            <span className={styles.latestLog}>
              {statusLogs[statusLogs.length - 1]}
            </span>
            <button type="button" onClick={() => setShowAllLogs(!showAllLogs)} className={styles.logToggleButton}>
              {showAllLogs ? <ChevronDown size={14} /> : <List size={14} />}
            </button>
          </div>
          {showAllLogs && (
            <div className={styles.logList}>
              {statusLogs.map((log, i) => (
                <div key={i} className={styles.logItem}>
                  <span className={styles.logTime}>Step {i+1}</span>
                  {log}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <footer className={styles.footer}>
        {attachments.length > 0 && (
          <div className={styles.attachmentPreview}>
            {attachments.map((file, i) => (
              <div key={i} className={styles.attachmentTag}>
                <span className={styles.attachmentName}>{file.name}</span>
                <button type="button" onClick={() => onRemoveAttachment(i)} className={styles.removeBtn}><X size={10} /></button>
              </div>
            ))}
          </div>
        )}
        <form onSubmit={onSendMessage} className={styles.inputGroup}>
          <button 
            type="button" 
            onClick={() => fileInputRef.current?.click()} 
            className={cn(styles.button, styles.attachButton)} 
            disabled={status !== AGENT_STATUS.IDLE}
          >
            <Paperclip size={18} />
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            multiple 
            style={{ display: 'none' }} 
            accept=".pdf,.jpg,.jpeg,.png,.docx,.txt" 
          />
          <textarea
            ref={textareaRef}
            rows={1}
            className={styles.textarea}
            placeholder="Type a message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={status === AGENT_STATUS.THINKING}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                onSendMessage();
              }
            }}
          />
          {input && status === AGENT_STATUS.IDLE && (
            <button 
              type="button" 
              onClick={onClearInput} 
              className={cn(styles.button, styles.clearButton)}
              title="Clear input"
            >
              <X size={18} />
            </button>
          )}
          {status !== AGENT_STATUS.IDLE ? (
            <button type="button" onClick={onCancelRequest} className={cn(styles.button, styles.stopButton)} title="Stop generation">
              <Square size={18} fill="currentColor" />
            </button>
          ) : (
            <button type="submit" className={styles.button} disabled={!input.trim()}>
              <Send size={18} />
            </button>
          )}
        </form>
      </footer>
    </div>
  );
};
