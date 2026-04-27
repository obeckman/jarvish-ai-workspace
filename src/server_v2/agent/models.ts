/**
 * Centralized model configuration for the Gemini Agent.
 * Using constants here allows for easy switching of models across the entire graph.
 */

// The primary model for complex reasoning, tool selection, and high-accuracy output.
export const REASONING_MODEL = "gemini-2.5-flash";

// Using Pro for processing and tools as well for maximum accuracy in the POC.
export const PROCESSING_MODEL = "gemini-2.5-flash";
export const TOOL_EXECUTION_MODEL = "gemini-2.5-flash";
export const ARCHIVE_MODEL = "gemini-2.5-flash";
