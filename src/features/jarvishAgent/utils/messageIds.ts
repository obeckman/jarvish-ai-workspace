export function createHistoryMessageId(messageIndex: number, blockIndex: number): string {
  return `history-${messageIndex}-${blockIndex}`;
}

export function createReasoningMessageId(timestamp: number, sequence: number): string {
  return `reasoning-${timestamp}-${sequence}`;
}

export function createAssistantMessageId(timestamp: number): string {
  return `assistant-${timestamp}`;
}

export function createUserMessageId(timestamp: number): string {
  return `user-${timestamp}`;
}
