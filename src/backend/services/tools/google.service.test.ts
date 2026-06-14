import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  getGoogleDocContent,
  listCalendarEvents,
  searchGmailMessages,
  updateGoogleDoc,
} from '@/backend/services/tools/google.service';

const setCredentialsMock = vi.fn();
const calendarListMock = vi.fn();
const gmailListMock = vi.fn();
const gmailGetMock = vi.fn();
const docsGetMock = vi.fn();
const docsBatchUpdateMock = vi.fn();

vi.mock('googleapis', () => ({
  google: {
    auth: {
      OAuth2: vi.fn().mockImplementation(function OAuth2Mock() {
        return { setCredentials: setCredentialsMock };
      }),
    },
    calendar: vi.fn(() => ({
      events: { list: calendarListMock },
    })),
    gmail: vi.fn(() => ({
      users: {
        messages: {
          list: gmailListMock,
          get: gmailGetMock,
        },
      },
    })),
    docs: vi.fn(() => ({
      documents: {
        get: docsGetMock,
        batchUpdate: docsBatchUpdateMock,
      },
    })),
  },
}));

vi.mock('@/backend/utils/logger', () => ({
  default: {
    error: vi.fn(),
  },
}));

describe('Google tool service', () => {
  beforeEach(() => {
    setCredentialsMock.mockReset();
    calendarListMock.mockReset();
    gmailListMock.mockReset();
    gmailGetMock.mockReset();
    docsGetMock.mockReset();
    docsBatchUpdateMock.mockReset();
  });

  it('lists calendar events with an OAuth client', async () => {
    const events = [{ id: 'event-1', summary: 'Standup' }];
    calendarListMock.mockResolvedValueOnce({ data: { items: events } });

    await expect(listCalendarEvents('access-token', { maxResults: 3 })).resolves.toBe(events);
    expect(setCredentialsMock).toHaveBeenCalledWith({ access_token: 'access-token' });
    expect(calendarListMock).toHaveBeenCalledWith(expect.objectContaining({
      calendarId: 'primary',
      maxResults: 3,
      singleEvents: true,
      orderBy: 'startTime',
    }));
  });

  it('returns an empty calendar event list when Google returns no items', async () => {
    calendarListMock.mockResolvedValueOnce({ data: {} });

    await expect(listCalendarEvents('access-token', {})).resolves.toEqual([]);
    expect(calendarListMock).toHaveBeenCalledWith(expect.objectContaining({ maxResults: 10 }));
  });

  it('returns auth guidance for expired Google Calendar tokens', async () => {
    calendarListMock.mockRejectedValueOnce({ code: 401, message: 'unauthorized' });

    await expect(listCalendarEvents('access-token', {})).resolves.toBe(
      'ERROR: Google authentication has expired or is invalid. Please log out and log in again to refresh your access.',
    );
  });

  it('searches Gmail messages and fetches snippets', async () => {
    gmailListMock.mockResolvedValueOnce({
      data: {
        messages: [{ id: 'm1' }, { id: 'm2' }],
      },
    });
    gmailGetMock
      .mockResolvedValueOnce({ data: { snippet: 'first', threadId: 't1' } })
      .mockResolvedValueOnce({ data: { snippet: 'second', threadId: 't2' } });

    await expect(searchGmailMessages('access-token', { query: 'invoice' })).resolves.toEqual([
      { id: 'm1', snippet: 'first', threadId: 't1' },
      { id: 'm2', snippet: 'second', threadId: 't2' },
    ]);
  });

  it('returns an empty Gmail result list when there are no messages', async () => {
    gmailListMock.mockResolvedValueOnce({ data: {} });

    await expect(searchGmailMessages('access-token', { query: 'missing' })).resolves.toEqual([]);
  });

  it('extracts Google Doc text runs', async () => {
    docsGetMock.mockResolvedValueOnce({
      data: {
        body: {
          content: [
            { paragraph: { elements: [{ textRun: { content: 'Hello ' } }] } },
            { paragraph: { elements: [{ textRun: { content: 'world' } }, {}] } },
          ],
        },
      },
    });

    await expect(getGoogleDocContent('access-token', { documentId: 'doc-1' })).resolves.toBe('Hello world');
  });

  it('returns generic Google Doc errors', async () => {
    docsGetMock.mockRejectedValueOnce(new Error('doc unavailable'));

    await expect(getGoogleDocContent('access-token', { documentId: 'doc-1' })).resolves.toBe(
      'ERROR: Failed to access Google Doc: doc unavailable',
    );
  });

  it('updates a Google Doc by appending text', async () => {
    docsBatchUpdateMock.mockResolvedValueOnce({});

    await expect(updateGoogleDoc('access-token', {
      documentId: 'doc-1',
      content: 'new content',
      append: true,
    })).resolves.toBe('Successfully updated Google Doc: doc-1');

    expect(docsBatchUpdateMock).toHaveBeenCalledWith({
      documentId: 'doc-1',
      requestBody: {
        requests: [{
          insertText: {
            text: 'new content',
            endOfSegmentLocation: {},
          },
        }],
      },
    });
  });

  it('returns generic update errors', async () => {
    docsBatchUpdateMock.mockRejectedValueOnce(new Error('update failed'));

    await expect(updateGoogleDoc('access-token', {
      documentId: 'doc-1',
      content: 'new content',
    })).resolves.toBe('ERROR: Failed to update Google Doc: update failed');
  });
});
