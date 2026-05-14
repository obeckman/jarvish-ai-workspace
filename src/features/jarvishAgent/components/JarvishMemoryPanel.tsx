import React from 'react';
import { Trash2, BrainCircuit, RefreshCw } from 'lucide-react';
import { useJarvishMemory } from '../hooks/useJarvishMemory';
import styles from '@/features/jarvishAgent/components/JarvishMemoryPanel.module.scss';

export const JarvishMemoryPanel: React.FC = () => {
  const { facts, isFetching, fetchFacts, deleteFact } = useJarvishMemory();

  return (
    <div className={styles.memoryPanel}>
      <div className={styles.memoryHeader}>
        <h2><BrainCircuit size={20} />Jarvish Memory</h2>
        <button onClick={fetchFacts} disabled={isFetching} className={styles.refreshBtn}>
          <RefreshCw size={16} className={isFetching ? styles.spin : ''} />
        </button>
      </div>
      
      <p className={styles.memoryDescription}>
        Here are the static facts Jarvish has learned about you across all sessions. 
        You can remove incorrect facts to correct Jarvish's context.
      </p>

      {facts.length === 0 && !isFetching && (
        <div className={styles.emptyMemory}>
          <p>Jarvish hasn't learned any specific facts about you yet.</p>
        </div>
      )}

      <div className={styles.factsGrid}>
        {facts.map(fact => (
          <div key={fact.id} className={styles.factCard}>
            <div className={styles.factContent}>
              <span className={styles.factCategory}>{fact.category.toUpperCase()}</span>
              <p>{fact.fact}</p>
            </div>
            <button 
              className={styles.deleteFactBtn} 
              onClick={() => deleteFact(fact.id)}
              title="Forget this fact"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
