import React, { useEffect, useState } from 'react';
import { Copy, Check } from 'lucide-react';
import styles from '../../jarvish-agent.module.scss';
import { clientLogger } from '@/frontend/utils/clientLogger';

interface CodeBlockProps {
  content: string;
  language?: string;
}

const SUPPORTED_LANGUAGES = ['typescript', 'javascript', 'python', 'json', 'bash', 'markdown', 'html', 'css'] as const;
const DEFAULT_LANGUAGE = 'typescript';
const SHIKI_THEME = 'nord';

type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];
type ShikiHighlighter = Awaited<ReturnType<Awaited<typeof import('shiki/core')>['createHighlighterCore']>>;

let highlighterPromise: Promise<ShikiHighlighter> | null = null;

function getHighlighter() {
  highlighterPromise ??= Promise.all([
    import('shiki/core'),
    import('shiki/engine/javascript'),
    import('@shikijs/themes/nord'),
    import('@shikijs/langs/typescript'),
    import('@shikijs/langs/javascript'),
    import('@shikijs/langs/python'),
    import('@shikijs/langs/json'),
    import('@shikijs/langs/bash'),
    import('@shikijs/langs/markdown'),
    import('@shikijs/langs/html'),
    import('@shikijs/langs/css'),
  ]).then(([
    { createHighlighterCore },
    { createJavaScriptRegexEngine },
    nord,
    typescript,
    javascript,
    python,
    json,
    bash,
    markdown,
    html,
    css,
  ]) =>
    createHighlighterCore({
      engine: createJavaScriptRegexEngine(),
      themes: [nord.default],
      langs: [
        typescript.default,
        javascript.default,
        python.default,
        json.default,
        bash.default,
        markdown.default,
        html.default,
        css.default,
      ],
    }),
  );

  return highlighterPromise;
}

function normalizeLanguage(language: string): SupportedLanguage {
  return SUPPORTED_LANGUAGES.includes(language as SupportedLanguage)
    ? language as SupportedLanguage
    : DEFAULT_LANGUAGE;
}

export const CodeBlock: React.FC<CodeBlockProps> = React.memo(({ content, language = 'typescript' }) => {
  const [highlighted, setHighlighted] = useState<string>('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let isMounted = true;
    
    async function highlight() {
      try {
        const highlighter = await getHighlighter();
        
        if (isMounted) {
          const html = highlighter.codeToHtml(content, {
            lang: normalizeLanguage(language),
            theme: SHIKI_THEME,
          });
          setHighlighted(html);
        }
      } catch (err) {
        clientLogger.error('Failed to highlight code:', err);
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
