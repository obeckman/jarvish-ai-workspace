import { describe, expect, it } from "vitest";

import { extractExplicitFactsFromHistory } from "@/backend/services/factExtraction.service";
import { ROLES } from "@/shared/jarvish.constants";

describe("extractExplicitFactsFromHistory", () => {
  it("extracts explicit user name declarations", () => {
    expect(extractExplicitFactsFromHistory([
      { role: ROLES.USER, content: "my name is oren " },
      { role: ROLES.ASSISTANT, content: "Nice to meet you, Oren." },
    ])).toEqual([
      {
        fact: "User's name is Oren.",
        category: "personal_info",
      },
    ]);
  });

  it("ignores assistant name echoes", () => {
    expect(extractExplicitFactsFromHistory([
      { role: ROLES.ASSISTANT, content: "Your note says my name is Jarvish." },
    ])).toEqual([]);
  });

  it("deduplicates repeated explicit facts in one history", () => {
    expect(extractExplicitFactsFromHistory([
      { role: ROLES.USER, content: "my name is oren" },
      { role: ROLES.USER, content: "call me Oren" },
    ])).toEqual([
      {
        fact: "User's name is Oren.",
        category: "personal_info",
      },
    ]);
  });

  it("stops the name at common sentence continuations", () => {
    expect(extractExplicitFactsFromHistory([
      { role: ROLES.USER, content: "my name is OREN and I like TypeScript" },
    ])).toEqual([
      {
        fact: "User's name is Oren.",
        category: "personal_info",
      },
    ]);
  });
});
