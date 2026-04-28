import React from 'react';
import { History, Plus, X, Trash2, Loader2 } from 'lucide-react';
import cn from 'classnames';
import styles from '@/features/jarvishAgent/jarvish-agent.module.scss';
import { Session } from '@/features/jarvishAgent/types';

interface JarvishSidebarProps {
  sessions: Session[];
  currentSessionId: string | null;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  onSelectSession: (id: string) => void;
  onCreateSession: () => void;
  onDeleteSession: (id: string, e: React.MouseEvent) => void;
  onTriggerSummary: (id: string, e: React.MouseEvent) => void;
  onLoadMore: () => void;
  hasMore: boolean;
  isFetching: boolean;
  isPollingSummary: boolean;
}

export const JarvishSidebar: React.FC<JarvishSidebarProps> = ({
  sessions,
  currentSessionId,
  searchTerm,
  setSearchTerm,
  onSelectSession,
  onCreateSession,
  onDeleteSession,
  onTriggerSummary,
  onLoadMore,
  hasMore,
  isFetching,
  isPollingSummary
}) => {
  return (
    <aside className={styles.sidebar}>
      <div className={styles.sidebarHeader}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <History size={18} color="#64748b" />
          <h3>Past Research</h3>
        </div>
        <button onClick={onCreateSession} className={styles.newChatBtn}>
          <Plus size={16} /> New Chat
        </button>
        
        <div className={styles.searchWrapper}>
          <input 
            type="text" 
            placeholder="Search history..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className={styles.clearSearch}>
              <X size={12} />
            </button>
          )}
        </div>
      </div>
      
      <div className={styles.sessionList}>
        {sessions.map(s => (
          <div 
            key={s.id} 
            onClick={() => onSelectSession(s.id)}
            className={cn(styles.sessionItem, { [styles.active]: currentSessionId === s.id })}
          >
            <div className={styles.sessionItemHeader}>
              <span className={styles.sessionTitle}>{s.summary?.summaryTitle || s.title}</span>
              <Trash2 size={12} className={styles.deleteIcon} onClick={(e) => onDeleteSession(s.id, e)} />
            </div>
            
            {s.summary ? (
              <div className={styles.summaryContent}>
                <p><strong>User:</strong> {s.summary.userMessage.substring(0, 50)}...</p>
                <p><strong>AI:</strong> {s.summary.aiAnswer.substring(0, 50)}...</p>
              </div>
            ) : (
              <div className={styles.summaryActions}>
                {currentSessionId === s.id && isPollingSummary ? (
                  <div className={styles.summaryLoading}>
                    <Loader2 size={10} className={styles.spin} /> Generating...
                  </div>
                ) : (
                  <button 
                    onClick={(e) => onTriggerSummary(s.id, e)} 
                    className={styles.summarizeBtn}
                  >
                    <History size={10} /> Summarize
                  </button>
                )}
              </div>
            )}
            
            <span className={styles.sessionDate}>{new Date(s.updatedAt).toLocaleDateString()}</span>
          </div>
        ))}
        
        {hasMore && (
          <button 
            onClick={onLoadMore} 
            className={styles.loadMoreBtn}
            disabled={isFetching}
          >
            {isFetching ? <Loader2 size={14} className={styles.spin} /> : "Load More"}
          </button>
        )}

        {sessions.length === 0 && !isFetching && (
          <div className={styles.emptyHistory}>
            No history found.
          </div>
        )}
      </div>
    </aside>
  );
};
