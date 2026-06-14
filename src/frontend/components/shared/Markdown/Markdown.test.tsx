/**
 * @vitest-environment jsdom
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Markdown } from '@/frontend/components/shared/Markdown/Markdown';

describe('Markdown', () => {
  it('renders markdown content with external-link safety attributes', () => {
    render(<Markdown content="[OpenAI](https://openai.com)" className="markdown-test" />);

    const link = screen.getByRole('link', { name: 'OpenAI' });
    expect(link).toHaveAttribute('href', 'https://openai.com');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });
});
