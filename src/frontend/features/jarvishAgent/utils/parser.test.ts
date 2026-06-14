import { describe, expect, it } from 'vitest';

import { parseAgentMessageContent } from '@/frontend/features/jarvishAgent/utils/parser';
import { BLOCK_TYPES, DISPLAY_TYPE } from '@/shared/jarvish.constants';

describe('Jarvish agent block parser', () => {
  it('returns plain text as a text block', () => {
    expect(parseAgentMessageContent('plain answer')).toEqual([
      { type: BLOCK_TYPES.TEXT, content: 'plain answer' },
    ]);
  });

  it('parses JSON block arrays wrapped in markdown fences', () => {
    expect(parseAgentMessageContent(`\`\`\`json
[
  {"type":"text","content":"hello"},
  {"type":"data","displayType":"table","data":[{"name":"Standup"}]}
]
\`\`\``)).toEqual([
      { type: BLOCK_TYPES.TEXT, content: 'hello' },
      {
        type: BLOCK_TYPES.DATA,
        displayType: DISPLAY_TYPE.TABLE,
        data: [{ name: 'Standup' }],
      },
    ]);
  });

  it('parses JSON block arrays wrapped in generic markdown fences', () => {
    expect(parseAgentMessageContent(`\`\`\`
[{"type":"text","content":"generic fence"}]
\`\`\``)).toEqual([
      { type: BLOCK_TYPES.TEXT, content: 'generic fence' },
    ]);
  });

  it('recursively unwraps a text block that contains structured blocks', () => {
    const nested = JSON.stringify([
      {
        type: BLOCK_TYPES.TEXT,
        content: JSON.stringify([{ type: BLOCK_TYPES.REASONING, content: 'inner plan' }]),
      },
    ]);

    expect(parseAgentMessageContent(nested)).toEqual([
      { type: BLOCK_TYPES.REASONING, content: 'inner plan' },
    ]);
  });

  it('preserves mixed text and code blocks from GraphQL message content', () => {
    const content = JSON.stringify([
      { type: BLOCK_TYPES.TEXT, content: "Here's an example:" },
      {
        type: BLOCK_TYPES.CODE,
        language: 'jsx',
        content: "import React from 'react';\n\nexport default function Button() {\n  return <button>Hover</button>;\n}",
      },
      { type: BLOCK_TYPES.TEXT, content: 'That component changes on hover.' },
    ]);

    expect(parseAgentMessageContent(content)).toEqual([
      { type: BLOCK_TYPES.TEXT, content: "Here's an example:" },
      {
        type: BLOCK_TYPES.CODE,
        language: 'jsx',
        content: "import React from 'react';\n\nexport default function Button() {\n  return <button>Hover</button>;\n}",
      },
      { type: BLOCK_TYPES.TEXT, content: 'That component changes on hover.' },
    ]);
  });

  it('splits legacy plain text answers with unfenced React code into code blocks', () => {
    const content = `Here's a simple example of a React component that changes its GUI when hovered:
import React, { useState } from 'react';

const HoverChangeComponent = () => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div onMouseEnter={() => setIsHovered(true)}>
      {isHovered ? 'You are hovering!' : 'Hover over me'}
    </div>
  );
};

export default HoverChangeComponent;
Explanation:
1. useState manages hover state.
To use this component, you would import it into another component:
// App.js
import React from 'react';
import HoverChangeComponent from './HoverChangeComponent';

function App() {
  return <HoverChangeComponent />;
}

export default App;`;

    expect(parseAgentMessageContent(content)).toEqual([
      {
        type: BLOCK_TYPES.TEXT,
        content: "Here's a simple example of a React component that changes its GUI when hovered:",
      },
      {
        type: BLOCK_TYPES.CODE,
        language: 'jsx',
        content: `import React, { useState } from 'react';

const HoverChangeComponent = () => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div onMouseEnter={() => setIsHovered(true)}>
      {isHovered ? 'You are hovering!' : 'Hover over me'}
    </div>
  );
};

export default HoverChangeComponent;`,
      },
      {
        type: BLOCK_TYPES.TEXT,
        content: `Explanation:
1. useState manages hover state.
To use this component, you would import it into another component:`,
      },
      {
        type: BLOCK_TYPES.CODE,
        language: 'jsx',
        content: `// App.js
import React from 'react';
import HoverChangeComponent from './HoverChangeComponent';

function App() {
  return <HoverChangeComponent />;
}

export default App;`,
      },
    ]);
  });

  it('does not split ordinary prose that only mentions code keywords', () => {
    const content = 'You can import this component later, but no code snippet is included here.';

    expect(parseAgentMessageContent(content)).toEqual([
      { type: BLOCK_TYPES.TEXT, content },
    ]);
  });

  it('infers typescript for legacy unfenced type/interface snippets', () => {
    const content = `Use this prop shape:
type HoverCardProps = {
  label: string;
  disabled?: boolean;
};
Notes:
Pass disabled when the action cannot run.`;

    expect(parseAgentMessageContent(content)).toEqual([
      { type: BLOCK_TYPES.TEXT, content: 'Use this prop shape:' },
      {
        type: BLOCK_TYPES.CODE,
        language: 'typescript',
        content: `type HoverCardProps = {
  label: string;
  disabled?: boolean;
};`,
      },
      {
        type: BLOCK_TYPES.TEXT,
        content: `Notes:
Pass disabled when the action cannot run.`,
      },
    ]);
  });

  it('renders code-only legacy content as a single code block', () => {
    const content = `function greet(name) {
  return \`Hello, \${name}\`;
}`;

    expect(parseAgentMessageContent(content)).toEqual([
      {
        type: BLOCK_TYPES.CODE,
        language: 'javascript',
        content,
      },
    ]);
  });

  it('infers python for legacy unfenced python snippets', () => {
    const content = `Try this:
def greet(name):
    return f"Hello, {name}"`;

    expect(parseAgentMessageContent(content)).toEqual([
      { type: BLOCK_TYPES.TEXT, content: 'Try this:' },
      {
        type: BLOCK_TYPES.CODE,
        language: 'python',
        content: `def greet(name):
    return f"Hello, {name}"`,
      },
    ]);
  });

  it('normalizes invalid items inside parsed arrays without crashing', () => {
    expect(parseAgentMessageContent(JSON.stringify([
      'loose text',
      { unexpected: true },
      null,
    ]))).toEqual([
      { type: BLOCK_TYPES.TEXT, content: 'loose text' },
      { type: BLOCK_TYPES.TEXT, content: JSON.stringify({ unexpected: true }) },
    ]);
  });

  it('normalizes single parsed values that are not block arrays', () => {
    expect(parseAgentMessageContent(JSON.stringify({
      type: BLOCK_TYPES.CODE,
      language: 'jsx',
      content: 'export default function App() { return <div />; }',
    }))).toEqual([
      {
        type: BLOCK_TYPES.CODE,
        language: 'jsx',
        content: 'export default function App() { return <div />; }',
      },
    ]);

    expect(parseAgentMessageContent(JSON.stringify({ unexpected: true }))).toEqual([
      { type: BLOCK_TYPES.TEXT, content: JSON.stringify({ unexpected: true }) },
    ]);

    expect(parseAgentMessageContent(JSON.stringify('quoted text'))).toEqual([
      { type: BLOCK_TYPES.TEXT, content: 'quoted text' },
    ]);
  });
});
