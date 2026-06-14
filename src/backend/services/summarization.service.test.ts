import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { summarizeSession } from "@/backend/services/summarization.service";
import { BLOCK_TYPES, ROLES } from "@/shared/jarvish.constants";

const generateContentMock = vi.fn();

vi.mock("@google/generative-ai", () => ({
  GoogleGenerativeAI: vi.fn().mockImplementation(function GoogleGenerativeAIMock() {
    return {
      getGenerativeModel: vi.fn(() => ({
        generateContent: generateContentMock,
      })),
    };
  }),
}));

vi.mock("@/backend/utils/logger", () => ({
  logger: {
    warn: vi.fn(),
  },
}));

describe("summarizeSession", () => {
  const originalArchiveEnrichment = process.env.ARCHIVE_AI_ENRICHMENT_ENABLED;

  beforeEach(() => {
    generateContentMock.mockReset();
  });

  afterEach(() => {
    process.env.ARCHIVE_AI_ENRICHMENT_ENABLED = originalArchiveEnrichment;
  });

  it("normalizes stringified message blocks in deterministic fallback summaries", async () => {
    process.env.ARCHIVE_AI_ENRICHMENT_ENABLED = "false";

    await expect(summarizeSession([
      { role: ROLES.USER, content: "whats the date" },
      {
        role: ROLES.AGENT,
        content: JSON.stringify([{ type: BLOCK_TYPES.TEXT, content: "Today is Sunday, June 14, 2026." }]),
      },
    ])).resolves.toEqual({
      summaryTitle: "Conversation Summary",
      userMessage: "whats the date",
      aiAnswer: "Today is Sunday, June 14, 2026.",
    });
  });

  it("uses AI enrichment when enabled and cleans markdown JSON fences", async () => {
    process.env.ARCHIVE_AI_ENRICHMENT_ENABLED = "true";
    generateContentMock.mockResolvedValueOnce({
      response: {
        text: () => `\`\`\`json
{
  "summaryTitle": "React Hover",
  "userMessage": "Show hover component",
  "aiAnswer": "Use state and mouse events."
}
\`\`\``,
      },
    });

    await expect(summarizeSession([
      { role: ROLES.USER, content: "show hover component" },
      { role: ROLES.AGENT, content: "use state" },
    ])).resolves.toEqual({
      summaryTitle: "React Hover",
      userMessage: "Show hover component",
      aiAnswer: "Use state and mouse events.",
    });
  });

  it("normalizes missing AI summary fields", async () => {
    process.env.ARCHIVE_AI_ENRICHMENT_ENABLED = "true";
    generateContentMock.mockResolvedValueOnce({
      response: {
        text: () => JSON.stringify({ summaryTitle: "", userMessage: null }),
      },
    });

    await expect(summarizeSession([
      { role: ROLES.USER, content: "hello" },
    ])).resolves.toEqual({
      summaryTitle: "Conversation Summary",
      userMessage: "N/A",
      aiAnswer: "N/A",
    });
  });

  it("falls back deterministically when AI summarization fails", async () => {
    process.env.ARCHIVE_AI_ENRICHMENT_ENABLED = "true";
    generateContentMock.mockRejectedValueOnce(new Error("model unavailable"));

    await expect(summarizeSession([
      { role: ROLES.USER, content: "user question" },
      { role: "ai", content: "assistant answer" },
    ])).resolves.toEqual({
      summaryTitle: "Conversation Summary",
      userMessage: "user question",
      aiAnswer: "assistant answer",
    });
  });
});
