/**
 * @vitest-environment jsdom
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createQueryWrapper } from '@/test/renderWithQueryClient';
import { HidingLagDemo } from './HidingLagDemo';

type Init = { method?: string; headers?: Record<string, string>; body?: string };

/** Fake server: primary updates on write, replica never catches up during the test. */
function createFakeServer() {
  let primaryName = 'Ada Lovelace';
  const replicaName = 'Ada Lovelace';
  const reads: Array<'primary' | 'replica'> = [];

  const handler = vi.fn(async (_url: string, init: Init = {}) => {
    if (init.method === 'PUT') {
      primaryName = JSON.parse(init.body!).name;
      return json({ profile: profile(primaryName), servedBy: 'primary' });
    }
    const forced = init.headers?.['x-force-primary'] === 'true';
    reads.push(forced ? 'primary' : 'replica');
    return json({ profile: profile(forced ? primaryName : replicaName), servedBy: forced ? 'primary' : 'replica' });
  });

  return { handler, reads };
}

const profile = (name: string) => ({ id: 'user-1', name, status: 'active', updatedAt: '' });
const json = (body: unknown) => ({ ok: true, status: 200, json: async () => body });

async function saveName(name: string) {
  const input = await screen.findByLabelText('Name');
  fireEvent.change(input, { target: { value: name } });
  fireEvent.click(screen.getByRole('button', { name: 'Save' }));
}

describe('HidingLagDemo', () => {
  let server: ReturnType<typeof createFakeServer>;

  beforeEach(() => {
    server = createFakeServer();
    vi.stubGlobal('fetch', server.handler);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('keeps the new name after saving when read-your-own-writes is on', async () => {
    render(<HidingLagDemo />, { wrapper: createQueryWrapper() });

    await saveName('Grace Hopper');

    await waitFor(() => expect(server.reads).toEqual(['replica', 'primary']));
    expect(screen.getByTestId('shown-name')).toHaveTextContent('Grace Hopper');
  });

  it('shows the stale replica value after saving when protection is off', async () => {
    render(<HidingLagDemo />, { wrapper: createQueryWrapper() });
    fireEvent.click(screen.getByLabelText('Read-your-own-writes protection'));

    await saveName('Grace Hopper');

    await waitFor(() => expect(server.reads).toEqual(['replica', 'replica']));
    await waitFor(() => expect(screen.getByTestId('shown-name')).toHaveTextContent('Ada Lovelace'));
  });
});
