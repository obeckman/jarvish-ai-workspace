import { describe, expect, it } from 'vitest';

import { getGraphQLHeaders } from '@/frontend/features/jarvishAgent/utils/authHeaders';

describe('Jarvish GraphQL auth headers', () => {
  it('adds bearer authorization when an id token is present', () => {
    expect(getGraphQLHeaders('id-token')).toEqual({
      'Content-Type': 'application/json',
      Authorization: 'Bearer id-token',
    });
  });

  it('omits authorization when no id token is present', () => {
    expect(getGraphQLHeaders(null)).toEqual({
      'Content-Type': 'application/json',
    });
  });

  it('normalizes Headers instances', () => {
    expect(getGraphQLHeaders('id-token', new Headers([
      ['Accept', 'text/event-stream'],
    ]))).toEqual({
      'Content-Type': 'application/json',
      accept: 'text/event-stream',
      Authorization: 'Bearer id-token',
    });
  });

  it('normalizes header tuple arrays', () => {
    expect(getGraphQLHeaders('id-token', [
      ['x-google-token', 'google-token'],
    ])).toEqual({
      'Content-Type': 'application/json',
      'x-google-token': 'google-token',
      Authorization: 'Bearer id-token',
    });
  });

  it('normalizes plain header objects', () => {
    expect(getGraphQLHeaders('id-token', {
      Accept: 'text/event-stream',
    })).toEqual({
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
      Authorization: 'Bearer id-token',
    });
  });
});
