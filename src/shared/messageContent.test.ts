import { describe, expect, it } from "vitest";

import { BLOCK_TYPES } from "@/shared/jarvish.constants";
import { messageContentToPlainText } from "@/shared/messageContent";

describe("messageContentToPlainText", () => {
  it("extracts text from structured agent block arrays", () => {
    expect(messageContentToPlainText([
      { type: BLOCK_TYPES.TEXT, content: "Today is Sunday, June 14, 2026." },
    ])).toBe("Today is Sunday, June 14, 2026.");
  });

  it("extracts text from stringified structured agent block arrays", () => {
    expect(messageContentToPlainText(JSON.stringify([
      { type: BLOCK_TYPES.TEXT, content: "Today is Sunday, June 14, 2026." },
    ]))).toBe("Today is Sunday, June 14, 2026.");
  });

  it("recovers text from legacy summaries truncated inside a stringified text block", () => {
    expect(messageContentToPlainText(
      '[{"type":"text","content":"You have the following meetings scheduled this week:\\n\\n* אורן חנן:',
    )).toBe("You have the following meetings scheduled this week:\n\n* אורן חנן:");
  });

  it("preserves ordinary strings", () => {
    expect(messageContentToPlainText("plain text")).toBe("plain text");
  });
});
