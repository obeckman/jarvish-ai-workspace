/**
 * Centralized model configuration for the Gemini Agent.
 * Using constants here allows for easy switching of models across the entire graph.
 */

// The primary model for complex reasoning, tool selection, and high-accuracy output.
export const REASONING_MODEL = process.env.GEMINI_REASONING_MODEL || "gemini-2.5-flash";

// Using the requested 2.5-flash model for all processing nodes.
export const PROCESSING_MODEL = process.env.GEMINI_PROCESSING_MODEL || REASONING_MODEL;
export const TOOL_EXECUTION_MODEL = process.env.GEMINI_TOOL_EXECUTION_MODEL || REASONING_MODEL;
export const ARCHIVE_MODEL = process.env.GEMINI_ARCHIVE_MODEL || REASONING_MODEL;
