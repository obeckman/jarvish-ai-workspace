import React from 'react';
import { User, Bot } from 'lucide-react';
import cn from 'classnames';
import styles from '../../jarvish-agent.module.scss';
import { Message, AgentMessageBlock } from '../../types';
import { ROLES, BLOCK_TYPES } from '@/shared/jarvish.constants';;
import { BlockRenderer } from './BlockRenderer';
import { Markdown } from '@/components/shared/Markdown/Markdown';


interface ChatMessageProps {
  message: Message;
  onAction?: (label: string) => void;
}

export const ChatMessage: React.FC<ChatMessageProps> = React.memo(({ message, onAction }) => {
  const isAgent = message.role === ROLES.AGENT || 
                  message.role === ROLES.MODEL || 
                  message.role === ROLES.ASSISTANT;
  const isUser = message.role === ROLES.USER || message.role === ROLES.HUMAN;

  const blocks: AgentMessageBlock[] = Array.isArray(message.content) 
    ? message.content 
    : [{ type: BLOCK_TYPES.TEXT, content: message.content as string }];

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
          <Markdown content={typeof message.content === 'string' ? message.content : JSON.stringify(message.content)} className={styles.messageText} />
        )}
      </div>
    </div>
  );
});

ChatMessage.displayName = 'ChatMessage';
