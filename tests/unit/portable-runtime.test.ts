import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('portable-runtime', () => {
  let tempRoot: string;
  let previousEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    vi.resetModules();
    previousEnv = { ...process.env };
    tempRoot = mkdtempSync(join(tmpdir(), 'pingclaw-portable-test-'));
    writeFileSync(join(tempRoot, '.pingclaw-portable'), '1\n', 'utf-8');
  });

  afterEach(() => {
    process.env = previousEnv;
    rmSync(tempRoot, { recursive: true, force: true });
  });

  it('bootstraps portable env from marker and explicit root', async () => {
    process.env.PINGCLAW_PORTABLE = '1';
    process.env.PINGCLAW_PORTABLE_ROOT = tempRoot;

    const mod = await import('@electron/utils/portable-runtime');
    const state = mod.bootstrapPortableRuntime({
      execPath: join(tempRoot, 'PingClaw.app', 'Contents', 'MacOS', 'PingClaw'),
    });

    expect(state.enabled).toBe(true);
    expect(state.root).toBe(tempRoot);
    expect(state.pingclawDataDir).toBe(join(tempRoot, 'data', 'pingclaw'));
    expect(state.openclawStateDir).toBe(join(tempRoot, 'data', 'openclaw'));
    expect(state.openclawConfigPath).toBe(join(tempRoot, 'data', 'openclaw', 'openclaw.json'));
    expect(process.env.OPENCLAW_STATE_DIR).toBe(state.openclawStateDir);
    expect(process.env.OPENCLAW_CONFIG_PATH).toBe(state.openclawConfigPath);
    expect(process.env.HOME).toBe(join(tempRoot, 'data', 'home'));
  });

  it('routes OpenClaw paths through centralized getters', async () => {
    process.env.PINGCLAW_PORTABLE = '1';
    process.env.PINGCLAW_PORTABLE_ROOT = tempRoot;

    await import('@electron/utils/portable-runtime');
    const paths = await import('@electron/utils/paths');

    expect(paths.isPortableMode()).toBe(true);
    expect(paths.getOpenClawConfigDir()).toBe(join(tempRoot, 'data', 'openclaw'));
    expect(paths.getOpenClawConfigPath()).toBe(join(tempRoot, 'data', 'openclaw', 'openclaw.json'));
    expect(paths.getPingClawConfigDir()).toBe(join(tempRoot, 'data', 'pingclaw'));
    expect(paths.getExpandHomeDir()).toBe(join(tempRoot, 'data', 'home'));
  });

  it.runIf(process.platform === 'darwin')('uses USB root for packaged portable mac builds', async () => {
    const usbRoot = mkdtempSync(join(tmpdir(), 'pingclaw-packaged-mac-'));
    const execPath = join(usbRoot, 'PingClaw.app', 'Contents', 'MacOS', 'PingClaw');
    const resourcesPath = join(usbRoot, 'PingClaw.app', 'Contents', 'Resources');
    mkdirSync(resourcesPath, { recursive: true });
    writeFileSync(join(resourcesPath, 'portable.marker'), '', 'utf-8');

    const mod = await import('@electron/utils/portable-runtime');
    const state = mod.bootstrapPortableRuntime({ execPath, resourcesPath });

    expect(state.enabled).toBe(true);
    expect(state.root).toBe(usbRoot);
    rmSync(usbRoot, { recursive: true, force: true });
  });

  it('stays disabled without portable markers or env', async () => {
    const plainRoot = mkdtempSync(join(tmpdir(), 'pingclaw-plain-'));
    delete process.env.PINGCLAW_PORTABLE;
    delete process.env.PINGCLAW_PORTABLE_ROOT;
    delete process.env.CLAWX_USER_DATA_DIR;
    delete process.env.OPENCLAW_STATE_DIR;

    const mod = await import('@electron/utils/portable-runtime');
    const state = mod.bootstrapPortableRuntime({
      execPath: join(plainRoot, 'PingClaw'),
    });

    expect(state.enabled).toBe(false);
    rmSync(plainRoot, { recursive: true, force: true });
  });
});
