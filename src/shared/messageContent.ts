type StructuredMessagePart = {
  content?: unknown;
  text?: unknown;
};

export function messageContentToPlainText(content: unknown): string {
  if (content == null) {
    return "";
  }

  if (typeof content === "string") {
    return stringContentToPlainText(content);
  }

  if (Array.isArray(content)) {
    return content
      .map(messagePartToPlainText)
      .filter(Boolean)
      .join("\n");
  }

  return messagePartToPlainText(content);
}

function stringContentToPlainText(content: string): string {
  const trimmed = content.trim();
  if (!trimmed) {
    return "";
  }

  const parsed = parseJson(trimmed);
  if (parsed == null) {
    return extractPartialTextBlockContent(trimmed) || content;
  }

  const extracted = messageContentToPlainText(parsed);
  return extracted || content;
}

function extractPartialTextBlockContent(content: string): string {
  const contentKey = '"content":"';
  const contentStart = content.indexOf(contentKey);
  if (!content.startsWith("[") || contentStart === -1 || !content.includes('"type":"text"')) {
    return "";
  }

  const fragmentStart = contentStart + contentKey.length;
  let fragment = content.slice(fragmentStart);
  const completeBlockEnd = fragment.lastIndexOf('"}]');
  if (completeBlockEnd >= 0) {
    fragment = fragment.slice(0, completeBlockEnd);
  }

  return decodeJsonStringFragment(fragment);
}

function decodeJsonStringFragment(fragment: string): string {
  try {
    return JSON.parse(`"${fragment}"`);
  } catch {
    return fragment
      .replace(/\\n/g, "\n")
      .replace(/\\t/g, "\t")
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, "\\");
  }
}

function messagePartToPlainText(part: unknown): string {
  if (part == null) {
    return "";
  }

  if (typeof part === "string") {
    return stringContentToPlainText(part);
  }

  if (typeof part !== "object") {
    return String(part);
  }

  if (Array.isArray(part)) {
    return messageContentToPlainText(part);
  }

  const structuredPart = part as StructuredMessagePart;
  if (typeof structuredPart.content === "string") {
    return stringContentToPlainText(structuredPart.content);
  }

  if (typeof structuredPart.text === "string") {
    return structuredPart.text;
  }

  return JSON.stringify(part);
}

function parseJson(content: string): unknown | null {
  if (!content.startsWith("[") && !content.startsWith("{")) {
    return null;
  }

  try {
    return JSON.parse(content);
  } catch {
    return null;
  }
}
