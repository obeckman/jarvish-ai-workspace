import React from 'react';
import { User, Bot } from 'lucide-react';
import cn from 'classnames';
import styles from '../../jarvish-agent.module.scss';
import { Message } from '../../types';
import { MESSAGE_ROLES } from '../../constants';
import { useStreamingBlocks } from '../../hooks/useStreamingBlocks';
import { BlockRenderer } from './BlockRenderer';
import { Markdown } from '@/components/shared/Markdown/Markdown';

interface ChatMessageProps {
  message: Message;
  onAction?: (label: string) => void;
}

export const ChatMessage: React.FC<ChatMessageProps> = React.memo(({ message, onAction }) => {
  const isAgent = message.role === MESSAGE_ROLES.AGENT;
  const isUser = message.role === MESSAGE_ROLES.USER;

  // Only attempt to parse blocks for agent messages
  const blocks = useStreamingBlocks(isAgent ? message.content : '');

  return (
    <div 
      className={cn(styles.message, {
        [styles.user]: isUser,
        [styles.agent]: isAgent,
      })}
    >
      <div className={styles.messageHeader}>
        <div className={styles.messageSender}>
          {isUser ? <User size={14} /> : <Bot size={14} />}
          <span className={styles.senderName}>{isUser ? 'You' : 'Jarvish'}</span>
        </div>
      </div>
      
      <div className={styles.messageBody}>
        {isAgent ? (
          <BlockRenderer blocks={blocks} onAction={onAction} />
        ) : (
          <Markdown content={message.content} className={styles.messageText} />
        )}
      </div>
    </div>
  );
});

ChatMessage.displayName = 'ChatMessage';
