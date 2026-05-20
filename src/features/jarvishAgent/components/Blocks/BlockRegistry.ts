import React from 'react';
import { BLOCK_TYPES } from '@/shared/jarvish.constants';
import { AnyBlockComponentProps } from './blockProps';
import { TextBlock } from './TextBlock';
import { ReasoningBlock } from './ReasoningBlock';
import { DraftBlock } from './DraftBlock';

type BlockComponent = React.ComponentType<AnyBlockComponentProps>;

// Lazy load heavy blocks
const CodeBlock = React.lazy(() => import('./CodeBlock').then(m => ({ default: m.CodeBlock })));
const ActionBlock = React.lazy(() => import('./ActionBlock').then(m => ({ default: m.ActionBlock })));
const DataBlock = React.lazy(() => import('./DataBlock').then(m => ({ default: m.DataBlock })));
const DocumentBlock = DraftBlock; // Re-use DraftBlock for DocumentBlock for now

export const BLOCK_COMPONENTS: Record<string, BlockComponent> = {
  [BLOCK_TYPES.TEXT]: TextBlock as BlockComponent,
  [BLOCK_TYPES.REASONING]: ReasoningBlock as BlockComponent,
  [BLOCK_TYPES.CODE]: CodeBlock as BlockComponent,
  [BLOCK_TYPES.ACTION]: ActionBlock as BlockComponent,
  [BLOCK_TYPES.DATA]: DataBlock as BlockComponent,
  [BLOCK_TYPES.DOCUMENT]: DocumentBlock as BlockComponent,
  [BLOCK_TYPES.DRAFT]: DraftBlock as BlockComponent,
};
