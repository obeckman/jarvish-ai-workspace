import { afterEach, describe, expect, it } from 'vitest';
import express from 'express';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { createHidingLagRouter } from './hidingLagRouter';

const LAG_MS = 50;

describe('hidingLagRouter', () => {
  let server: Server | null = null;

  afterEach(async () => {
    await new Promise<void>((resolve) => (server ? server.close(() => resolve()) : resolve()));
    server = null;
  });

  async function start() {
    const app = express();
    app.use('/api/hiding-lag', createHidingLagRouter({ replicationLagMs: LAG_MS }));
    server = app.listen(0);
    await new Promise<void>((resolve) => server!.once('listening', () => resolve()));
    const { port } = server.address() as AddressInfo;
    return `http://127.0.0.1:${port}/api/hiding-lag/profile`;
  }

  const read = (url: string, forcePrimary = false) =>
    fetch(url, { headers: forcePrimary ? { 'x-force-primary': 'true' } : {} }).then((r) => r.json());

  const write = (url: string, name: unknown) =>
    fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });

  it('routes plain reads to the replica and forced reads to the primary', async () => {
    const url = await start();
    expect((await read(url)).servedBy).toBe('replica');
    expect((await read(url, true)).servedBy).toBe('primary');
  });

  it('writes to the primary and the replica catches up after the lag', async () => {
    const url = await start();

    const writeRes = await write(url, 'Grace Hopper');
    expect(writeRes.status).toBe(200);
    expect((await writeRes.json()).servedBy).toBe('primary');

    // Stale replica read right after the write.
    expect((await read(url)).profile.name).toBe('Ada Lovelace');
    // Primary already has it.
    expect((await read(url, true)).profile.name).toBe('Grace Hopper');

    await new Promise((resolve) => setTimeout(resolve, LAG_MS * 2));
    expect((await read(url)).profile.name).toBe('Grace Hopper');
  });

  it('rejects invalid names', async () => {
    const url = await start();
    expect((await write(url, '   ')).status).toBe(400);
    expect((await write(url, 42)).status).toBe(400);
    expect((await write(url, 'x'.repeat(81))).status).toBe(400);
  });
});
