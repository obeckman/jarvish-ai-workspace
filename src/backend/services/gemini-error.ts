import { BLOCK_TYPES } from "@/shared/jarvish.constants";

export type GeminiErrorDetails = {
  status?: number;
  statusText?: string;
  message: string;
  isAuthOrPermissionError: boolean;
};

export function getGeminiErrorDetails(error: unknown): GeminiErrorDetails {
  const status = getStatus(error);
  const statusText = getStatusText(error);
  const message = getMessage(error);

  return {
    status,
    statusText,
    message,
    isAuthOrPermissionError: status === 401 || status === 403,
  };
}

export function formatGeminiOperationalMessage(error: unknown): string {
  const details = getGeminiErrorDetails(error);

  if (details.isAuthOrPermissionError) {
    return [
      "Jarvish could not call Gemini because the configured API key or Google Cloud project is not authorized for the selected model.",
      "Check GEMINI_API_KEY, API enablement, billing, and the GEMINI_*_MODEL values in your .env file.",
    ].join(" ");
  }

  if (details.status === 429) {
    return "Jarvish hit the Gemini rate limit. Wait briefly and try again, or switch to a model/quota with more capacity.";
  }

  if (details.status && details.status >= 500) {
    return "Gemini is temporarily unavailable. Jarvish kept the session alive, but the model call should be retried.";
  }

  return "Jarvish could not complete the model call. Check the backend logs for the provider response.";
}

export function createGeminiErrorBlockContent(error: unknown): string {
  return JSON.stringify([
    {
      type: BLOCK_TYPES.TEXT,
      content: formatGeminiOperationalMessage(error),
    },
  ]);
}

function getStatus(error: unknown): number | undefined {
  if (!error || typeof error !== "object") {
    return undefined;
  }

  if ("status" in error && typeof error.status === "number") {
    return error.status;
  }

  if ("response" in error && error.response && typeof error.response === "object" && "status" in error.response) {
    return typeof error.response.status === "number" ? error.response.status : undefined;
  }

  return undefined;
}

function getStatusText(error: unknown): string | undefined {
  if (!error || typeof error !== "object") {
    return undefined;
  }

  if ("statusText" in error && typeof error.statusText === "string") {
    return error.statusText;
  }

  if ("response" in error && error.response && typeof error.response === "object" && "statusText" in error.response) {
    return typeof error.response.statusText === "string" ? error.response.statusText : undefined;
  }

  return undefined;
}

function getMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
    return error.message;
  }

  return "Unknown Gemini error";
}
