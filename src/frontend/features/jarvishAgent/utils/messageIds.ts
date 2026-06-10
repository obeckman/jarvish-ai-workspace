export function createHistoryMessageId(messageIndex: number, blockIndex: number): string {
  return `history-${messageIndex}-${blockIndex}`;
}

export function createReasoningMessageId(parentMessageId: string, sequence: number): string {
  return `reasoning-${parentMessageId}-${sequence}`;
}

export function createAssistantMessageId(timestamp: number): string {
  return `assistant-${timestamp}`;
}

export function createUserMessageId(timestamp: number): string {
  return `user-${timestamp}`;
}
