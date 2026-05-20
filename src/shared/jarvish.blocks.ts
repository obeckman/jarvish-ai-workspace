import { z } from "zod";

import { BLOCK_TYPES, DISPLAY_TYPE } from "@/shared/jarvish.constants";

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export const JsonValueSchema: z.ZodType<JsonValue> = z.lazy(() => z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
  z.array(JsonValueSchema),
  z.record(z.string(), JsonValueSchema),
]));

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
  payload: z.record(z.string(), JsonValueSchema).optional(),
  disabled: z.boolean().optional(),
  loading: z.boolean().optional(),
});

export const DataBlockSchema = z.object({
  type: z.literal(BLOCK_TYPES.DATA),
  displayType: z.enum(Object.values(DISPLAY_TYPE)),
  title: z.string().optional(),
  data: JsonValueSchema.describe("Data for rendering, can be an arbitrary JSON-serializable structure."),
});

export const DocumentBlockSchema = z.object({
  type: z.literal(BLOCK_TYPES.DOCUMENT),
  title: z.string().optional(),
  content: z.string(),
});

export const DraftBlockSchema = z.object({
  type: z.literal(BLOCK_TYPES.DRAFT),
  title: z.string().optional(),
  content: z.string(),
  metadata: z.record(z.string(), JsonValueSchema).optional(),
});

export const AgentMessageBlockSchema = z.discriminatedUnion("type", [
  TextBlockSchema,
  CodeBlockSchema,
  ReasoningBlockSchema,
  ActionBlockSchema,
  DataBlockSchema,
  DocumentBlockSchema,
  DraftBlockSchema,
]);

export const AgentMessageBlocksSchema = z.array(AgentMessageBlockSchema);

export type AgentMessageBlock = z.infer<typeof AgentMessageBlockSchema>;
export type AgentMessageBlocks = z.infer<typeof AgentMessageBlocksSchema>;
