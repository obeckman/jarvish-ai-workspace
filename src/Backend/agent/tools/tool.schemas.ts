import { z } from "zod";

export const WebSearchToolArgsSchema = z.object({
  query: z.string().min(1),
});

export const FetchWebPageToolArgsSchema = z.object({
  url: z.string().url(),
});

export const ReadPdfToolArgsSchema = z.object({
  url: z.string().url(),
});

export const ReadFileToolArgsSchema = z.object({
  path: z.string().min(1),
});

export const WriteFileToolArgsSchema = z.object({
  path: z.string().min(1),
  content: z.string(),
});

export const AddMemoryToolArgsSchema = z.object({
  fact: z.string().min(1),
  category: z.string().optional(),
});

export const ForgetMemoryToolArgsSchema = z.object({
  memoryId: z.string().min(1),
});

export const QueryAttachmentsToolArgsSchema = z.object({
  query: z.string().min(1),
});

export const InventoryToolArgsSchema = z.object({
  sku: z.string().min(1),
});

export const ListCalendarEventsToolArgsSchema = z.object({
  maxResults: z.number().int().positive().optional(),
});

export const SearchGmailMessagesToolArgsSchema = z.object({
  query: z.string().min(1),
});

export const GoogleDocToolArgsSchema = z.object({
  documentId: z.string().min(1),
});

export const UpdateGoogleDocToolArgsSchema = z.object({
  documentId: z.string().min(1),
  content: z.string(),
  append: z.boolean().optional(),
});
