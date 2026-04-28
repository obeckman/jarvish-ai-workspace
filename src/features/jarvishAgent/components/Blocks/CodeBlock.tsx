import React, { useEffect, useState } from 'react';
import { getHighlighter, Highlighter } from 'shiki';
import { Copy, Check } from 'lucide-react';
import styles from '../../jarvish-agent.module.scss';

interface CodeBlockProps {
  content: string;
  language?: string;
}

export const CodeBlock: React.FC<CodeBlockProps> = React.memo(({ content, language = 'typescript' }) => {
  const [highlighted, setHighlighted] = useState<string>('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let isMounted = true;
    
    async function highlight() {
      const highlighter = await getHighlighter({
        themes: ['nord'],
        langs: ['typescript', 'javascript', 'python', 'json', 'bash', 'markdown', 'html', 'css'],
      });
      
      if (isMounted) {
        const html = highlighter.codeToHtml(content, {
          lang: language,
          theme: 'nord',
        });
        setHighlighted(html);
      }
    }

    highlight();
    return () => { isMounted = false; };
  }, [content, language]);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={styles.codeBlock}>
      <div className={styles.codeHeader}>
        <span className={styles.languageBadge}>{language}</span>
        <button onClick={handleCopy} className={styles.copyBtn}>
          {copied ? <Check size={14} /> : <Copy size={14} />}
        </button>
      </div>
      {highlighted ? (
        <div dangerouslySetInnerHTML={{ __html: highlighted }} />
      ) : (
        <pre><code>{content}</code></pre>
      )}
    </div>
  );
});

CodeBlock.displayName = 'CodeBlock';
