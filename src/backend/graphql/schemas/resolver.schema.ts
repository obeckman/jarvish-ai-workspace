import { z } from "zod";

import { ROLES } from "@/shared/jarvish.constants";

export const RESOLVER_INPUT_LIMITS = {
  query: 4_000,
  historyItems: 50,
  historyContent: 16_000,
  historyTotalContent: 64_000,
  sessionId: 128,
  search: 200,
  title: 200,
  attachmentCount: 5,
  attachmentName: 255,
  attachmentBytes: 10 * 1024 * 1024,
  totalAttachmentBytes: 20 * 1024 * 1024,
} as const;

const ALLOWED_ATTACHMENT_MIME_TYPES = [
  "application/pdf",
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
  "text/csv",
  "text/markdown",
  "text/plain",
] as const;

const MESSAGE_ROLE_VALUES = [
  ROLES.USER,
  ROLES.AGENT,
  ROLES.REASONING,
  ROLES.HUMAN,
  ROLES.MODEL,
  ROLES.ASSISTANT,
  ROLES.TOOL,
  ROLES.SYSTEM,
  ROLES.FUNCTION,
] as const;

const BASE64_PATTERN = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
const maxBase64Length = Math.ceil(RESOLVER_INPUT_LIMITS.attachmentBytes / 3) * 4;

function getBase64DecodedBytes(value: string): number {
  const padding = value.endsWith("==") ? 2 : value.endsWith("=") ? 1 : 0;
  return (value.length * 3) / 4 - padding;
}

function getHistoryContentLength(history: Array<{ content: string }>): number {
  return history.reduce((total, message) => total + message.content.length, 0);
}

function getAttachmentBytes(attachments: Array<{ data: string }>): number {
  return attachments.reduce((total, attachment) => total + getBase64DecodedBytes(attachment.data), 0);
}

export const MessageRoleSchema = z.enum(MESSAGE_ROLE_VALUES);

export const MessageInputSchema = z.object({
  role: MessageRoleSchema,
  content: z.string().max(RESOLVER_INPUT_LIMITS.historyContent),
}).strict();

export const AttachmentInputSchema = z.object({
  name: z.string().min(1).max(RESOLVER_INPUT_LIMITS.attachmentName),
  data: z.string()
    .min(1)
    .max(maxBase64Length)
    .regex(BASE64_PATTERN)
    .refine((value) => getBase64DecodedBytes(value) <= RESOLVER_INPUT_LIMITS.attachmentBytes, {
      message: "Attachment exceeds maximum decoded size",
    }),
  mimeType: z.enum(ALLOWED_ATTACHMENT_MIME_TYPES),
}).strict();

export const GetSessionsArgsSchema = z.object({
  limit: z.number().int().positive().nullish(),
  offset: z.number().int().min(0).nullish(),
  search: z.string().max(RESOLVER_INPUT_LIMITS.search).nullish(),
});

export const SessionIdArgsSchema = z.object({
  sessionId: z.string().min(1).max(RESOLVER_INPUT_LIMITS.sessionId),
});

export const CreateSessionArgsSchema = z.object({
  title: z.string().min(1).max(RESOLVER_INPUT_LIMITS.title),
  initialQuery: z.string().min(1).max(RESOLVER_INPUT_LIMITS.query).nullish(),
}).strict();

export const DeleteByIdArgsSchema = z.object({
  id: z.string().min(1).max(RESOLVER_INPUT_LIMITS.sessionId),
});

export const StartResearchArgsSchema = z.object({
  query: z.string().min(1).max(RESOLVER_INPUT_LIMITS.query),
  history: z.array(MessageInputSchema).max(RESOLVER_INPUT_LIMITS.historyItems).default([]),
}).superRefine(({ history }, ctx) => {
  if (getHistoryContentLength(history) > RESOLVER_INPUT_LIMITS.historyTotalContent) {
    ctx.addIssue({
      code: "custom",
      message: "History exceeds maximum total content length",
      path: ["history"],
    });
  }
});

export const StreamAgentEventsInputSchema = z.object({
  query: z.string().min(1).max(RESOLVER_INPUT_LIMITS.query),
  history: z.array(MessageInputSchema)
    .max(RESOLVER_INPUT_LIMITS.historyItems)
    .nullish()
    .transform((value) => value ?? []),
  attachments: z.array(AttachmentInputSchema)
    .max(RESOLVER_INPUT_LIMITS.attachmentCount)
    .nullish()
    .transform((value) => value ?? []),
  sessionId: z.string().min(1).max(RESOLVER_INPUT_LIMITS.sessionId).nullish(),
  googleToken: z.string().nullish(),
}).superRefine(({ history, attachments }, ctx) => {
  if (getHistoryContentLength(history) > RESOLVER_INPUT_LIMITS.historyTotalContent) {
    ctx.addIssue({
      code: "custom",
      message: "History exceeds maximum total content length",
      path: ["history"],
    });
  }

  if (getAttachmentBytes(attachments) > RESOLVER_INPUT_LIMITS.totalAttachmentBytes) {
    ctx.addIssue({
      code: "custom",
      message: "Attachments exceed maximum total decoded size",
      path: ["attachments"],
    });
  }
});

export type MessageInputBoundary = z.infer<typeof MessageInputSchema>;
export type AttachmentInputBoundary = z.infer<typeof AttachmentInputSchema>;
export type StreamAgentEventsInputBoundary = z.infer<typeof StreamAgentEventsInputSchema>;
