import React from 'react';
import { Bot, LogIn, LogOut, Trash2, Layout, MessageSquare } from 'lucide-react';
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
        <div className={styles.botIconWrapper}>
            <Bot size={20} color="white" />
        </div>
        <h2 className={styles.headerTitle}>Jarvish</h2>
      </div>

      <div className={styles.headerActions}>
        {currentSessionId && (
          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', padding: '4px', borderRadius: '10px', marginRight: '1rem' }}>
            <button 
              className={cn(styles.viewToggle, !showFullConversation && styles.active)}
              onClick={() => setShowFullConversation(false)}
            >
              <Layout size={14} style={{ marginRight: '6px' }} />
              Summary
            </button>
            <button 
              className={cn(styles.viewToggle, showFullConversation && styles.active)}
              onClick={() => setShowFullConversation(true)}
            >
              <MessageSquare size={14} style={{ marginRight: '6px' }} />
              Chat
            </button>
          </div>
        )}

        {googleToken ? (
          <button onClick={onLogout} className={cn(styles.button, styles.logoutButton)} title="Logout Google">
            <LogOut size={18} />
          </button>
        ) : (
          <button onClick={onLogin} className={styles.button} title="Login Google">
            <LogIn size={18} />
          </button>
        )}
        <button onClick={onResetUI} className={cn(styles.button, styles.clearButton)} title="Reset Chat UI">
          <Trash2 size={18} />
        </button>
      </div>
    </header>
  );
};
