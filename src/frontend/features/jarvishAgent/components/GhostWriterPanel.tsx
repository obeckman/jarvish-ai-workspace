import React from 'react';
import { FileText, Wand2, Sparkles, Shrink, Layout } from 'lucide-react';
import { Markdown } from '@/frontend/components/shared/Markdown/Markdown';
import styles from '../jarvish-agent.module.scss';

interface GhostWriterPanelProps {
  content: string;
  title?: string;
  onAction: (action: string) => void;
  isVisible: boolean;
  onClose: () => void;
}

export const GhostWriterPanel: React.FC<GhostWriterPanelProps> = ({ 
  content, 
  title, 
  onAction, 
  isVisible,
  onClose
}) => {
  if (!isVisible) return null;

  return (
    <div className={styles.ghostWriter}>
      <div className={styles.ghostHeader}>
        <div className={styles.ghostTitle}>
          <FileText size={18} />
          <span>{title || 'Drafting Document...'}</span>
        </div>
        <button onClick={onClose} className={styles.closeBtn}>×</button>
      </div>

      <div className={styles.ghostActions}>
        <button onClick={() => onAction('Make more professional')} className={styles.actionBtn}>
          <Wand2 size={14} /> Professional
        </button>
        <button onClick={() => onAction('Shorten')} className={styles.actionBtn}>
          <Shrink size={14} /> Shorten
        </button>
        <button onClick={() => onAction('Add Table')} className={styles.actionBtn}>
          <Layout size={14} /> Add Table
        </button>
        <button onClick={() => onAction('Enhance with examples')} className={styles.actionBtn}>
          <Sparkles size={14} /> Enhance
        </button>
      </div>

      <div className={styles.ghostPreview}>
        <Markdown content={content} />
      </div>

      <div className={styles.ghostFooter}>
        <span className={styles.statusDot}></span>
        <span>Jarvish is writing...</span>
      </div>
    </div>
  );
};
