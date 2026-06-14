/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  MAX_ATTACHMENT_BYTES,
  encodeAttachment,
  isAttachmentTooLarge,
} from '@/frontend/features/jarvishAgent/hooks/UseJarvishChat/attachmentEncoder';

describe('Jarvish attachment encoder', () => {
  const OriginalFileReader = globalThis.FileReader;

  afterEach(() => {
    vi.restoreAllMocks();
    globalThis.FileReader = OriginalFileReader;
  });

  it('detects oversized attachments', () => {
    expect(isAttachmentTooLarge(new File(['x'], 'small.txt'))).toBe(false);

    const largeFile = new File(['x'], 'large.txt');
    Object.defineProperty(largeFile, 'size', { value: MAX_ATTACHMENT_BYTES + 1 });

    expect(isAttachmentTooLarge(largeFile)).toBe(true);
  });

  it('encodes files as base64 attachment payloads', async () => {
    const file = new File(['hello'], 'hello.txt', { type: 'text/plain' });

    await expect(encodeAttachment(file)).resolves.toEqual({
      name: 'hello.txt',
      data: 'aGVsbG8=',
      mimeType: 'text/plain',
    });
  });

  it('rejects FileReader errors', async () => {
    class ErrorFileReader {
      error = new Error('reader failed');
      onerror: (() => void) | null = null;
      onload: ((event: ProgressEvent<FileReader>) => void) | null = null;

      readAsDataURL() {
        this.onerror?.();
      }
    }

    globalThis.FileReader = ErrorFileReader as unknown as typeof FileReader;

    await expect(encodeAttachment(new File(['x'], 'bad.txt'))).rejects.toThrow('reader failed');
  });

  it('rejects non-string FileReader results', async () => {
    class NonStringFileReader {
      error = null;
      onerror: (() => void) | null = null;
      onload: ((event: ProgressEvent<FileReader>) => void) | null = null;

      readAsDataURL() {
        this.onload?.({ target: { result: new ArrayBuffer(0) } } as ProgressEvent<FileReader>);
      }
    }

    globalThis.FileReader = NonStringFileReader as unknown as typeof FileReader;

    await expect(encodeAttachment(new File(['x'], 'bad.txt'))).rejects.toThrow('Failed to encode attachment.');
  });
});
