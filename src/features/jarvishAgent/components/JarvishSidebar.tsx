import React from 'react';
import { History, Plus, X, Trash2, Loader2, Search, MessageSquareCode } from 'lucide-react';
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
        <div className={styles.sidebarHeaderTop}>
          <History size={16} color="var(--jarvish-text-secondary)" />
          <h3>Research History</h3>
        </div>
        
        <button onClick={onCreateSession} className={styles.newChatBtn}>
          <Plus size={18} /> New Session
        </button>
        
        <div className={styles.searchWrapper}>
          <div className={styles.searchIconWrapper}>
            <Search size={14} />
          </div>
          <input 
            type="text" 
            placeholder="Search sessions..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className={styles.clearSearch}>
              <X size={14} />
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
              <button 
                className={styles.removeBtn} 
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteSession(s.id, e);
                }}
              >
                <Trash2 size={12} />
              </button>
            </div>
            
            {s.summary ? (
              <div className={styles.summaryContent}>
                <p>
                  {s.summary.aiAnswer}
                </p>
              </div>
            ) : (
              <div className={styles.summaryActions}>
                {currentSessionId === s.id && isPollingSummary ? (
                  <div className={styles.summaryLoading}>
                    <Loader2 size={10} className={styles.spin} /> 
                    <span>Generating Summary...</span>
                  </div>
                ) : (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      onTriggerSummary(s.id, e);
                    }} 
                    className={styles.summarizeBtn}
                  >
                    <MessageSquareCode size={10} /> Summarize
                  </button>
                )}
              </div>
            )}
            
            <span className={styles.sessionDate}>{new Date(s.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
          </div>
        ))}
        
        {hasMore && (
          <button 
            onClick={onLoadMore} 
            className={styles.loadMoreBtn}
            disabled={isFetching}
          >
            {isFetching ? <Loader2 size={14} className={styles.spin} /> : "Load older sessions"}
          </button>
        )}

        {sessions.length === 0 && !isFetching && (
          <div className={styles.emptyHistory}>
            <p>No research sessions found.</p>
          </div>
        )}
      </div>
    </aside>
  );
};
