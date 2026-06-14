import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  selectWhere: vi.fn(),
  updateSet: vi.fn(),
  updateWhere: vi.fn(),
  addMemory: vi.fn(),
  forgetMemory: vi.fn(),
  loggerError: vi.fn(),
  loggerInfo: vi.fn(),
  loggerWarn: vi.fn(),
}));

vi.mock("@/backend/db", () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: mocks.selectWhere,
      })),
    })),
    update: vi.fn(() => ({
      set: mocks.updateSet,
    })),
  },
}));

vi.mock("@/backend/services/memory/memory.service", () => ({
  addMemory: mocks.addMemory,
  forgetMemory: mocks.forgetMemory,
  MEMORY_TYPES: {
    STRUCTURED_FACT: "structured_fact",
  },
}));

vi.mock("@/backend/utils/logger", () => ({
  logger: {
    debug: vi.fn(),
    error: mocks.loggerError,
    info: mocks.loggerInfo,
    warn: mocks.loggerWarn,
  },
}));

describe("extractAndStoreExplicitFacts storage", () => {
  beforeEach(() => {
    Object.values(mocks).forEach((mock) => mock.mockReset());
    mocks.updateSet.mockReturnValue({ where: mocks.updateWhere });
    mocks.updateWhere.mockResolvedValue(undefined);
    mocks.addMemory.mockResolvedValue("new-vector-id");
    mocks.forgetMemory.mockResolvedValue(undefined);
  });

  it("replaces same-subject conflicts from explicit user declarations", async () => {
    mocks.selectWhere.mockResolvedValue([
      {
        id: "fact-1",
        sessionId: "old-session",
        userId: "user-1",
        fact: "User's name is Menachem.",
        category: "personal_info",
        confidence: 100,
        vectorMemoryId: "old-vector-id",
        createdAt: new Date("2026-06-01T00:00:00.000Z"),
      },
    ]);

    const { extractAndStoreExplicitFacts } = await import("@/backend/services/factExtraction.service");

    await expect(extractAndStoreExplicitFacts("session-1", "user-1", [
      { role: "user", content: "my name is oren" },
    ])).resolves.toEqual([
      {
        fact: "User's name is Oren.",
        category: "personal_info",
        status: "updated",
        conflictWith: "User's name is Menachem.",
      },
    ]);

    expect(mocks.addMemory).toHaveBeenCalledWith(
      "User's name is Oren.",
      expect.objectContaining({
        sourceId: "fact-1",
        structuredFactId: "fact-1",
        userId: "user-1",
        sessionId: "session-1",
        category: "personal_info",
      }),
    );
    expect(mocks.updateSet).toHaveBeenCalledWith(expect.objectContaining({
      sessionId: "session-1",
      userId: "user-1",
      fact: "User's name is Oren.",
      category: "personal_info",
      vectorMemoryId: "new-vector-id",
    }));
    expect(mocks.forgetMemory).toHaveBeenCalledWith("old-vector-id");
  });
});
