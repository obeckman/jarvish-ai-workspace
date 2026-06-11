import type { Attachment } from '@/frontend/features/jarvishAgent/types';

export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

export function isAttachmentTooLarge(file: File): boolean {
  return file.size > MAX_ATTACHMENT_BYTES;
}

export function encodeAttachment(file: File): Promise<Attachment> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => {
      reject(reader.error ?? new Error('Failed to read attachment.'));
    };

    reader.onload = (event) => {
      const result = event.target?.result;
      if (typeof result !== 'string') {
        reject(new Error('Failed to encode attachment.'));
        return;
      }

      resolve({
        name: file.name,
        data: result.split(',')[1] ?? '',
        mimeType: file.type,
      });
    };

    reader.readAsDataURL(file);
  });
}
