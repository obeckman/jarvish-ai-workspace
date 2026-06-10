export function getToolErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown tool error";
}

export function getToolErrorStatus(error: unknown): number | undefined {
  if (!error || typeof error !== "object") {
    return undefined;
  }

  const status = "status" in error ? error.status : undefined;
  if (typeof status === "number") {
    return status;
  }

  const code = "code" in error ? error.code : undefined;
  if (typeof code === "number") {
    return code;
  }

  return undefined;
}
