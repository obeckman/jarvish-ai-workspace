import { z } from 'zod';
import { ActionBlockSchema, DataBlockSchema } from '../../types';
import { DISPLAY_TYPE, BLOCK_TYPES } from '@/shared/jarvish.constants';

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
  payload?: z.infer<typeof ActionBlockSchema>['payload']; 
  disabled?: boolean;
  loading?: boolean;
  onAction?: (label: string) => void;
}

export interface DataBlockComponentProps {
  type: typeof BLOCK_TYPES.DATA;
  displayType: (typeof DISPLAY_TYPE)[keyof typeof DISPLAY_TYPE];
  title?: string;
  data: z.infer<typeof DataBlockSchema>['data']; 
  onAction?: (label: string) => void;
}

export interface DocumentBlockComponentProps {
  type: typeof BLOCK_TYPES.DOCUMENT;
  title?: string;
  content: string;
  onAction?: (label: string) => void;
}

export interface DraftBlockComponentProps {
  type: typeof BLOCK_TYPES.DRAFT;
  title?: string;
  content: string;
  onAction?: (label: string) => void;
}

// Union type of all possible component props
export type AnyBlockComponentProps = 
  | TextBlockComponentProps
  | CodeBlockComponentProps
  | ReasoningBlockComponentProps
  | ActionBlockComponentProps
  | DataBlockComponentProps
  | DocumentBlockComponentProps
  | DraftBlockComponentProps;
