import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('getOpenClawForkEnv', () => {
  let tempRoot: string;
  let previousEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    vi.resetModules();
    previousEnv = { ...process.env };
    tempRoot = mkdtempSync(join(tmpdir(), 'pingclaw-fork-env-'));
    writeFileSync(join(tempRoot, '.pingclaw-portable'), '1\n', 'utf-8');
  });

  afterEach(() => {
    process.env = previousEnv;
    rmSync(tempRoot, { recursive: true, force: true });
  });

  it('points OpenClaw state at the USB drive in portable mode', async () => {
    process.env.PINGCLAW_PORTABLE = '1';
    process.env.PINGCLAW_PORTABLE_ROOT = tempRoot;
    process.env.CLAWX_USER_DATA_DIR = join(tempRoot, 'data', 'pingclaw');
    process.env.OPENCLAW_STATE_DIR = join(tempRoot, 'data', 'openclaw');
    process.env.OPENCLAW_CONFIG_PATH = join(tempRoot, 'data', 'openclaw', 'openclaw.json');

    const paths = await import('@electron/utils/paths');
    const forkEnv = paths.getOpenClawForkEnv();

    expect(forkEnv.OPENCLAW_STATE_DIR).toBe(join(tempRoot, 'data', 'openclaw'));
    expect(forkEnv.OPENCLAW_CONFIG_PATH).toBe(join(tempRoot, 'data', 'openclaw', 'openclaw.json'));
    expect(forkEnv.HOME).toBe(join(tempRoot, 'data', 'home'));
    expect(forkEnv.OPENCLAW_HOME).toBe(join(tempRoot, 'data', 'home'));
    expect(forkEnv.PINGCLAW_PORTABLE).toBe('1');
  });

  it('always sets OPENCLAW_STATE_DIR even outside portable mode', async () => {
    delete process.env.PINGCLAW_PORTABLE;
    delete process.env.PINGCLAW_PORTABLE_ROOT;
    delete process.env.OPENCLAW_STATE_DIR;
    delete process.env.OPENCLAW_CONFIG_PATH;

    const paths = await import('@electron/utils/paths');
    const forkEnv = paths.getOpenClawForkEnv();

    expect(forkEnv.OPENCLAW_STATE_DIR).toBeTruthy();
    expect(forkEnv.OPENCLAW_CONFIG_PATH).toContain('openclaw.json');
    expect(forkEnv.PINGCLAW_PORTABLE).toBeUndefined();
  });
});
