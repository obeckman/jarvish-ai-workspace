import React from 'react';
import { BLOCK_TYPES } from '../../constants';
import { TextBlock } from './TextBlock';
import { ReasoningBlock } from './ReasoningBlock';

// Lazy load heavy blocks
const CodeBlock = React.lazy(() => import('./CodeBlock').then(m => ({ default: m.CodeBlock })));
const ActionBlock = React.lazy(() => import('./ActionBlock').then(m => ({ default: m.ActionBlock })));
const DataBlock = React.lazy(() => import('./DataBlock').then(m => ({ default: m.DataBlock })));

export const BLOCK_COMPONENTS: Record<string, React.ComponentType<any>> = {
  [BLOCK_TYPES.TEXT]: TextBlock,
  [BLOCK_TYPES.REASONING]: ReasoningBlock,
  [BLOCK_TYPES.CODE]: CodeBlock,
  [BLOCK_TYPES.ACTION]: ActionBlock,
  [BLOCK_TYPES.DATA]: DataBlock,
};
