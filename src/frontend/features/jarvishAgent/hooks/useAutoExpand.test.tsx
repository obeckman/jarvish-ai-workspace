/**
 * @vitest-environment jsdom
 */
import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useAutoExpand } from '@/frontend/features/jarvishAgent/hooks/useAutoExpand';

describe('useAutoExpand', () => {
  it('sets textarea height to its scroll height when value changes', () => {
    const { result, rerender } = renderHook(({ value }) => useAutoExpand(value), {
      initialProps: { value: 'short' },
    });
    const textarea = document.createElement('textarea');

    Object.defineProperty(textarea, 'scrollHeight', {
      configurable: true,
      value: 84,
    });

    result.current.current = textarea;
    rerender({ value: 'longer text' });

    expect(textarea.style.height).toBe('84px');
  });
});
