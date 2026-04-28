import React from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';
import styles from '../../jarvish-agent.module.scss';

interface TextBlockProps {
  content: string;
}

export const TextBlock: React.FC<TextBlockProps> = React.memo(({ content }) => {
  return (
    <div className={styles.textBlock}>
      <ReactMarkdown rehypePlugins={[rehypeSanitize]}>
        {content}
      </ReactMarkdown>
    </div>
  );
});

TextBlock.displayName = 'TextBlock';
