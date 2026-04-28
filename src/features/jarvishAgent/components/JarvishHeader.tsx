import React from 'react';
import { Bot, LogIn, LogOut, Trash2 } from 'lucide-react';
import cn from 'classnames';
import styles from '@/features/jarvishAgent/jarvish-agent.module.scss';

interface JarvishHeaderProps {
  currentSessionId: string | null;
  showFullConversation: boolean;
  setShowFullConversation: (show: boolean) => void;
  googleToken: string | null;
  onLogin: () => void;
  onLogout: () => void;
  onResetUI: () => void;
}

export const JarvishHeader: React.FC<JarvishHeaderProps> = ({
  currentSessionId,
  showFullConversation,
  setShowFullConversation,
  googleToken,
  onLogin,
  onLogout,
  onResetUI
}) => {
  return (
    <header className={styles.header}>
      <div className={styles.sidebarTitleWrapper}>
        <Bot size={24} />
        <div>
          <h2 className={styles.headerTitle}>Jarvish Agent</h2>
          {currentSessionId && (
            <button 
              onClick={() => setShowFullConversation(!showFullConversation)} 
              className={styles.viewToggle}
            >
              {showFullConversation ? "Show Summary" : "Show Full Conversation"}
            </button>
          )}
        </div>
      </div>
      <div className={styles.headerActions}>
        {googleToken ? (
          <button onClick={onLogout} className={cn(styles.button, styles.logoutButton)} title="Logout Google">
            <LogOut size={16} />
          </button>
        ) : (
          <button onClick={onLogin} className={styles.button} title="Login Google">
            <LogIn size={16} />
          </button>
        )}
        <button onClick={onResetUI} className={styles.button} title="Reset Chat UI">
          <Trash2 size={16} />
        </button>
      </div>
    </header>
  );
};
