import React from 'react';
import styles from '../../jarvish-agent.module.scss';
import { Markdown } from '@/components/shared/Markdown/Markdown';

interface TextBlockProps {
  content: string;
}

export const TextBlock: React.FC<TextBlockProps> = React.memo(({ content }) => {
  return (
    <Markdown content={content} className={styles.textBlock} />
  );
});

TextBlock.displayName = 'TextBlock';
