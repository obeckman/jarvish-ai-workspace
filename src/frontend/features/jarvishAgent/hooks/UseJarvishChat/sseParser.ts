export class SseParser {
  private bufferedText = '';
  private dataLines: string[] = [];

  push(chunk: string): string[] {
    this.bufferedText += chunk.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    const lines = this.bufferedText.split('\n');
    this.bufferedText = lines.pop() ?? '';

    return this.processLines(lines);
  }

  flush(): string[] {
    const lines = this.bufferedText ? [this.bufferedText] : [];
    this.bufferedText = '';

    const messages = this.processLines(lines);
    const finalMessage = this.dispatchCurrentEvent();
    if (finalMessage === null) {
      return messages;
    }

    return [...messages, finalMessage];
  }

  private processLines(lines: string[]): string[] {
    const messages: string[] = [];

    for (const line of lines) {
      if (line === '') {
        const message = this.dispatchCurrentEvent();
        if (message !== null) {
          messages.push(message);
        }
        continue;
      }

      if (line.startsWith(':')) {
        continue;
      }

      const separatorIndex = line.indexOf(':');
      const field = separatorIndex === -1 ? line : line.slice(0, separatorIndex);
      let value = separatorIndex === -1 ? '' : line.slice(separatorIndex + 1);

      if (value.startsWith(' ')) {
        value = value.slice(1);
      }

      if (field === 'data') {
        this.dataLines.push(value);
      }
    }

    return messages;
  }

  private dispatchCurrentEvent(): string | null {
    if (this.dataLines.length === 0) {
      return null;
    }

    const message = this.dataLines.join('\n');
    this.dataLines = [];
    return message;
  }
}
