import { afterEach, describe, expect, it } from 'vitest';

import { getCoderWorkerFunctionDeclarations } from '@/backend/agent/nodes/workers/coder';
import { TOOL_NAMES } from '@/shared/jarvish.constants';

const originalEnv = { ...process.env };

describe('coder worker tool declarations', () => {
  afterEach(() => {
    process.env = originalEnv;
  });

  it('excludes write_file in production', () => {
    process.env = { ...originalEnv, NODE_ENV: 'production' };

    expect(getCoderWorkerFunctionDeclarations().map((declaration) => declaration.name)).toEqual([
      TOOL_NAMES.READ_FILE,
      TOOL_NAMES.ADD_MEMORY,
      TOOL_NAMES.FORGET_MEMORY,
      TOOL_NAMES.CHECK_INVENTORY,
    ]);
  });

  it('keeps write_file available outside production', () => {
    process.env = { ...originalEnv, NODE_ENV: 'development' };

    expect(getCoderWorkerFunctionDeclarations().map((declaration) => declaration.name)).toContain(TOOL_NAMES.WRITE_FILE);
  });
});
