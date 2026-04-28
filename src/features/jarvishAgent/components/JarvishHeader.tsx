import React from 'react';
import { Bot, LogIn, Trash2, Layout, MessageSquare } from 'lucide-react';
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

const GoogleIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
    />
  </svg>
);

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
        
        <div className={styles.googleStatusWrapper}>
           {googleToken ? (
             <button 
               onClick={onLogout} 
               className={styles.googleBadge} 
               title="Google Account Connected. Click to logout."
             >
               <GoogleIcon />
               <span>Connected</span>
               <span className={styles.statusDot} />
             </button>
           ) : (
             <button 
               onClick={onLogin} 
               className={cn(styles.googleBadge, styles.disconnected)} 
               title="Click to connect Google Account"
             >
               <GoogleIcon />
               <span>Connect</span>
               <LogIn size={10} style={{ marginLeft: '2px' }} />
             </button>
           )}
        </div>
      </div>

      <div className={styles.headerActions}>
        {currentSessionId && (
          <div className={styles.viewToggleGroup}>
            <button 
              className={cn(styles.viewToggle, !showFullConversation && styles.active)}
              onClick={() => setShowFullConversation(false)}
            >
              <Layout size={14} />
              Summary
            </button>
            <button 
              className={cn(styles.viewToggle, showFullConversation && styles.active)}
              onClick={() => setShowFullConversation(true)}
            >
              <MessageSquare size={14} />
              Chat
            </button>
          </div>
        )}

        <button onClick={onResetUI} className={cn(styles.button, styles.clearButton)} title="Reset Chat UI">
          <Trash2 size={18} />
        </button>
      </div>
    </header>
  );
};
