import React from 'react';
import { BLOCK_TYPES } from '../../constants';
import { AnyBlockComponentProps } from './blockProps';
import { TextBlock } from './TextBlock';
import { ReasoningBlock } from './ReasoningBlock';
import { DraftBlock } from './DraftBlock';

// Lazy load heavy blocks
const CodeBlock = React.lazy(() => import('./CodeBlock').then(m => ({ default: m.CodeBlock })));
const ActionBlock = React.lazy(() => import('./ActionBlock').then(m => ({ default: m.ActionBlock })));
const DataBlock = React.lazy(() => import('./DataBlock').then(m => ({ default: m.DataBlock })));

export const BLOCK_COMPONENTS: Record<string, React.ComponentType<AnyBlockComponentProps>> = {
  [BLOCK_TYPES.TEXT]: TextBlock,
  [BLOCK_TYPES.REASONING]: ReasoningBlock,
  [BLOCK_TYPES.CODE]: CodeBlock,
  [BLOCK_TYPES.ACTION]: ActionBlock,
  [BLOCK_TYPES.DATA]: DataBlock,
  [BLOCK_TYPES.DRAFT]: DraftBlock,
};
