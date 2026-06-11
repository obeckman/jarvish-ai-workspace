import { z } from "zod";

export const MessageInputSchema = z.object({
  role: z.string(),
  content: z.string(),
});

export const AttachmentInputSchema = z.object({
  name: z.string(),
  data: z.string(),
  mimeType: z.string(),
});

export const GetSessionsArgsSchema = z.object({
  limit: z.number().int().positive().nullish(),
  offset: z.number().int().min(0).nullish(),
  search: z.string().nullish(),
});

export const SessionIdArgsSchema = z.object({
  sessionId: z.string().min(1),
});

export const CreateSessionArgsSchema = z.object({
  title: z.string(),
  initialQuery: z.string().nullish(),
}).strict();

export const DeleteByIdArgsSchema = z.object({
  id: z.string().min(1),
});

export const StartResearchArgsSchema = z.object({
  query: z.string().min(1),
  history: z.array(MessageInputSchema).default([]),
});

export const StreamAgentEventsInputSchema = z.object({
  query: z.string().min(1),
  history: z.array(MessageInputSchema).nullish().transform((value) => value ?? []),
  attachments: z.array(AttachmentInputSchema).nullish().transform((value) => value ?? []),
  sessionId: z.string().nullish(),
  googleToken: z.string().nullish(),
});

export type MessageInputBoundary = z.infer<typeof MessageInputSchema>;
export type AttachmentInputBoundary = z.infer<typeof AttachmentInputSchema>;
export type StreamAgentEventsInputBoundary = z.infer<typeof StreamAgentEventsInputSchema>;
