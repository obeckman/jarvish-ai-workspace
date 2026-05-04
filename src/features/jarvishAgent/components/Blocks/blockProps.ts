import { z } from 'zod';
import { BLOCK_TYPES } from '../../constants';
import { ActionBlockSchema, DataBlockSchema } from '../../types';

// Define specific prop interfaces for each block type, mirroring their .tsx files,
// but ensuring payload/data types align with Zod schemas and including onAction where applicable.

export interface TextBlockComponentProps {
  type: typeof BLOCK_TYPES.TEXT;
  content: string;
  onAction?: (label: string) => void;
}

export interface CodeBlockComponentProps {
  type: typeof BLOCK_TYPES.CODE;
  content: string;
  language?: string;
  onAction?: (label: string) => void;
}

export interface ReasoningBlockComponentProps {
  type: typeof BLOCK_TYPES.REASONING;
  content: string;
  title?: string;
  onAction?: (label: string) => void;
}

export interface ActionBlockComponentProps {
  type: typeof BLOCK_TYPES.ACTION;
  actionId: string;
  label: string;
  payload?: z.infer<typeof ActionBlockSchema>['payload']; // Use Zod's inferred type
  disabled?: boolean;
  loading?: boolean;
  onAction?: (label: string) => void;
}

export interface DataBlockComponentProps {
  type: typeof BLOCK_TYPES.DATA;
  displayType: 'table' | 'chart';
  title?: string;
  data: z.infer<typeof DataBlockSchema>['data']; // Use Zod's inferred type
  onAction?: (label: string) => void;
}

export interface DocumentBlockComponentProps {
  type: typeof BLOCK_TYPES.DOCUMENT;
  title?: string;
  content: string;
  onClick?: () => void; // DraftBlock has onClick, map DocumentBlock to it
  onAction?: (label: string) => void; // General prop for all blocks
}

// Union type of all possible component props
export type AnyBlockComponentProps = 
  | TextBlockComponentProps
  | CodeBlockComponentProps
  | ReasoningBlockComponentProps
  | ActionBlockComponentProps
  | DataBlockComponentProps
  | DocumentBlockComponentProps;
