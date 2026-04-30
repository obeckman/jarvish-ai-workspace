import React from 'react';
import { FileText, ExternalLink } from 'lucide-react';
import styles from '../../jarvish-agent.module.scss';

interface DraftBlockProps {
  title?: string;
  content: string;
  onClick?: () => void; // New onClick prop
}

export const DraftBlock: React.FC<DraftBlockProps> = ({ title, content, onClick }) => {
  return (
    <div className={styles.draftBlockChat}>
      <div className={styles.draftIcon}>
        <FileText size={16} />
      </div>
      <div className={styles.draftInfo}>
        <strong>{title || 'Document Draft Updated'}</strong>
        <span>{content.substring(0, 60)}...</span>
      </div>
      <div className={styles.draftHint} onClick={onClick}>
        <ExternalLink size={14} />
        <span>See Side Panel</span>
      </div>
    </div>
  );
};
