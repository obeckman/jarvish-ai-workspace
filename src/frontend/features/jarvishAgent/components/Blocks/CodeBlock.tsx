import React, { useEffect, useState } from 'react';
import { Check, Copy, X } from 'lucide-react';
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
type CopyStatus = 'idle' | 'success' | 'error';

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

async function copyToClipboard(content: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(content);
    return;
  }

  const textArea = document.createElement('textarea');
  textArea.value = content;
  textArea.setAttribute('readonly', '');
  textArea.style.position = 'fixed';
  textArea.style.top = '-9999px';
  textArea.style.left = '-9999px';

  document.body.appendChild(textArea);
  textArea.select();

  try {
    if (!document.execCommand('copy')) {
      throw new Error('Copy command was rejected');
    }
  } finally {
    document.body.removeChild(textArea);
  }
}

export const CodeBlock: React.FC<CodeBlockProps> = React.memo(({ content, language = 'typescript' }) => {
  const [highlighted, setHighlighted] = useState<string>('');
  const [copyStatus, setCopyStatus] = useState<CopyStatus>('idle');

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

  const handleCopy = async () => {
    try {
      await copyToClipboard(content);
      setCopyStatus('success');
    } catch (err) {
      clientLogger.warn('Failed to copy code block:', err);
      setCopyStatus('error');
    }

    setTimeout(() => setCopyStatus('idle'), 2000);
  };

  const copyLabel = copyStatus === 'success'
    ? 'Copied code'
    : copyStatus === 'error'
      ? 'Failed to copy code'
      : 'Copy code';

  return (
    <div className={styles.codeBlock}>
      <div className={styles.codeHeader}>
        <span className={styles.languageBadge}>{language}</span>
        <button
          onClick={handleCopy}
          className={styles.copyBtn}
          data-copy-status={copyStatus}
          aria-label={copyLabel}
          title={copyLabel}
        >
          {copyStatus === 'success' ? <Check size={14} /> : copyStatus === 'error' ? <X size={14} /> : <Copy size={14} />}
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
