import { afterEach, describe, expect, it } from "vitest";

import { summarizeSession } from "@/backend/services/summarization.service";
import { BLOCK_TYPES, ROLES } from "@/shared/jarvish.constants";

describe("summarizeSession", () => {
  const originalArchiveEnrichment = process.env.ARCHIVE_AI_ENRICHMENT_ENABLED;

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
});
