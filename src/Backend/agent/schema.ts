import { z } from 'zod';

export const BLOCK_TYPES = {
  TEXT: 'text',
  CODE: 'code',
  REASONING: 'reasoning',
  ACTION: 'action',
  DATA: 'data',
  DRAFT: 'draft',
} as const;

export const TextBlockSchema = z.object({
  type: z.literal(BLOCK_TYPES.TEXT),
  content: z.string(),
});

export const CodeBlockSchema = z.object({
  type: z.literal(BLOCK_TYPES.CODE),
  language: z.string().optional(),
  content: z.string(),
});

export const ReasoningBlockSchema = z.object({
  type: z.literal(BLOCK_TYPES.REASONING),
  title: z.string().optional(),
  content: z.string(),
});

export const ActionBlockSchema = z.object({
  type: z.literal(BLOCK_TYPES.ACTION),
  actionId: z.string(),
  label: z.string(),
  payload: z.any().optional(),
  disabled: z.boolean().optional(),
  loading: z.boolean().optional(),
});

export const DataBlockSchema = z.object({
  type: z.literal(BLOCK_TYPES.DATA),
  displayType: z.enum(['table', 'chart']),
  title: z.string().optional(),
  data: z.any(),
});

export const DraftBlockSchema = z.object({
  type: z.literal(BLOCK_TYPES.DRAFT),
  title: z.string().optional(),
  content: z.string(),
  metadata: z.record(z.any()).optional(),
});

export const AgentMessageBlockSchema = z.discriminatedUnion('type', [
  TextBlockSchema,
  CodeBlockSchema,
  ReasoningBlockSchema,
  ActionBlockSchema,
  DataBlockSchema,
  DraftBlockSchema,
]);

export const AgentMessageBlocksSchema = z.array(AgentMessageBlockSchema);

export type AgentMessageBlock = z.infer<typeof AgentMessageBlockSchema>;
