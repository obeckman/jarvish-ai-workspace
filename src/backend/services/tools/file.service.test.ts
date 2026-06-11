import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const originalCwd = process.cwd();
const originalEnv = { ...process.env };

let tempParent: string;
let projectRoot: string;

async function importFileService() {
  vi.resetModules();
  return import('@/backend/services/tools/file.service');
}

async function writeFixture(relativePath: string, content = 'fixture') {
  const fullPath = path.join(projectRoot, relativePath);
  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  await fs.writeFile(fullPath, content, 'utf-8');
}

describe('local file tool policy', () => {
  beforeEach(async () => {
    tempParent = await fs.mkdtemp(path.join(os.tmpdir(), 'jarvish-file-tools-'));
    projectRoot = path.join(tempParent, 'app');
    await fs.mkdir(projectRoot, { recursive: true });
    process.chdir(projectRoot);
    process.env = { ...originalEnv, NODE_ENV: 'development' };
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    process.env = originalEnv;
    vi.resetModules();
    await fs.rm(tempParent, { recursive: true, force: true });
  });

  it('denies parent-directory traversal', async () => {
    const { readFile } = await importFileService();

    await expect(readFile({ path: '../secret.txt' })).resolves.toBe(
      'Error: Access denied. You can only read approved project files.',
    );
  });

  it('denies absolute paths outside the project root', async () => {
    const outsidePath = path.join(tempParent, 'outside.txt');
    await fs.writeFile(outsidePath, 'outside', 'utf-8');
    const { readFile } = await importFileService();

    await expect(readFile({ path: outsidePath })).resolves.toBe(
      'Error: Access denied. You can only read approved project files.',
    );
  });

  it('denies sibling-prefix paths outside the project root', async () => {
    const siblingPath = path.join(tempParent, 'app-secret', 'secret.txt');
    await fs.mkdir(path.dirname(siblingPath), { recursive: true });
    await fs.writeFile(siblingPath, 'sibling secret', 'utf-8');
    const { readFile } = await importFileService();

    await expect(readFile({ path: siblingPath })).resolves.toBe(
      'Error: Access denied. You can only read approved project files.',
    );
  });

  it('denies .env files in every environment', async () => {
    await writeFixture('.env', 'SECRET=1');
    await writeFixture('.env.local', 'SECRET=2');
    const { readFile } = await importFileService();

    await expect(readFile({ path: '.env' })).resolves.toBe(
      'Error: Access denied. You can only read approved project files.',
    );
    await expect(readFile({ path: '.env.local' })).resolves.toBe(
      'Error: Access denied. You can only read approved project files.',
    );
  });

  it('allows production reads for docs and selected overview source files', async () => {
    process.env.NODE_ENV = 'production';
    await writeFixture('docs/architecture/tool-execution.md', 'tool docs');
    await writeFixture('src/backend/agent/tools/tool-executor.ts', 'executor overview');
    const { readFile } = await importFileService();

    await expect(readFile({ path: 'docs/architecture/tool-execution.md' })).resolves.toBe('tool docs');
    await expect(readFile({ path: 'src/backend/agent/tools/tool-executor.ts' })).resolves.toBe('executor overview');
  });

  it('denies production reads for non-allowlisted source files', async () => {
    process.env.NODE_ENV = 'production';
    await writeFixture('src/backend/index.ts', 'server bootstrap');
    const { readFile } = await importFileService();

    await expect(readFile({ path: 'src/backend/index.ts' })).resolves.toBe(
      'Error: Access denied. You can only read approved project files.',
    );
  });

  it('denies production writes', async () => {
    process.env.NODE_ENV = 'production';
    const { writeFile } = await importFileService();

    await expect(writeFile({ path: 'docs/new.md', content: 'nope' })).resolves.toBe(
      'Error: Access denied. File writing is disabled in production.',
    );
  });

  it('allows development writes inside the project root', async () => {
    const { writeFile } = await importFileService();

    await expect(writeFile({ path: 'notes/output.txt', content: 'saved' })).resolves.toBe(
      'Successfully wrote to file: notes/output.txt',
    );
    await expect(fs.readFile(path.join(projectRoot, 'notes/output.txt'), 'utf-8')).resolves.toBe('saved');
  });
});
