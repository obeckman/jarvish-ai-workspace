import React from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';
import { Sparkles, ChevronDown } from 'lucide-react';
import cn from 'classnames';
import styles from '../../jarvish-agent.module.scss';

interface ReasoningBlockProps {
  content: string;
  title?: string;
}

export const ReasoningBlock: React.FC<ReasoningBlockProps> = React.memo(({ content, title = 'Reasoning' }) => {
  return (
    <details className={styles.reasoningBlock}>
      <summary className={styles.reasoningSummary}>
        <div className={styles.summaryContent}>
          <Sparkles size={14} className={styles.reasoningIcon} />
          <span className={styles.reasoningTitle}>{title}</span>
        </div>
        <ChevronDown size={16} className={styles.chevron} />
      </summary>
      <div className={styles.reasoningContent}>
        <ReactMarkdown rehypePlugins={[rehypeSanitize]}>
          {content}
        </ReactMarkdown>
      </div>
    </details>
  );
});

ReasoningBlock.displayName = 'ReasoningBlock';
