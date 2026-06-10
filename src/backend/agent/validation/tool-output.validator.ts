import { TOOL_CONFIDENCE_THRESHOLD, TOOL_NAMES } from "@/shared/jarvish.constants";

export type ToolOutputValidationResult = {
  valid: boolean;
  confidence: number;
  reason: string;
};

const FAILURE_MARKERS = [
  "access denied",
  "authentication required",
  "error:",
  "failed to",
  "not recognized",
];

const EMPTY_RESULT_MARKERS = [
  "could not find",
  "no results found",
  "not found",
];

export function validateToolOutput(toolName: string, output: unknown): ToolOutputValidationResult {
  if (output === null || output === undefined) {
    return invalidToolOutput("Tool returned no output.", 0);
  }

  if (Array.isArray(output)) {
    return validateArrayToolOutput(toolName, output);
  }

  if (typeof output === "string") {
    return validateStringToolOutput(toolName, output);
  }

  if (typeof output === "object") {
    return {
      valid: true,
      confidence: 100,
      reason: "Tool returned a structured object.",
    };
  }

  return {
    valid: true,
    confidence: TOOL_CONFIDENCE_THRESHOLD,
    reason: "Tool returned a primitive value.",
  };
}

function validateArrayToolOutput(toolName: string, output: unknown[]): ToolOutputValidationResult {
  if (output.length === 0) {
    return invalidToolOutput(`${toolName} returned an empty result set.`, 50);
  }

  return {
    valid: true,
    confidence: 100,
    reason: `${toolName} returned ${output.length} result(s).`,
  };
}

function validateStringToolOutput(toolName: string, output: string): ToolOutputValidationResult {
  const trimmed = output.trim();

  if (!trimmed) {
    return invalidToolOutput(`${toolName} returned an empty string.`, 0);
  }

  const lowerOutput = trimmed.toLowerCase();

  if (FAILURE_MARKERS.some((marker) => lowerOutput.includes(marker))) {
    return invalidToolOutput(`${toolName} returned an operational failure.`, 0);
  }

  if (EMPTY_RESULT_MARKERS.some((marker) => lowerOutput.includes(marker))) {
    return invalidToolOutput(`${toolName} returned no decisive result.`, 50);
  }

  if (toolName === TOOL_NAMES.WEB_SEARCH && !lowerOutput.includes("url:")) {
    return {
      valid: true,
      confidence: 75,
      reason: "Search returned text without explicit URLs.",
    };
  }

  return {
    valid: true,
    confidence: 100,
    reason: `${toolName} returned non-empty output.`,
  };
}

function invalidToolOutput(reason: string, confidence: number): ToolOutputValidationResult {
  return {
    valid: false,
    confidence,
    reason,
  };
}
