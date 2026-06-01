import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const originalPlatform = process.platform;

const {
  mockIsPortableMode,
} = vi.hoisted(() => ({
  mockIsPortableMode: { value: false },
}));

function setPlatform(platform: string) {
  Object.defineProperty(process, 'platform', { value: platform, writable: true });
}

vi.mock('electron', () => ({
  app: {
    isPackaged: true,
  },
}));

vi.mock('@electron/utils/paths', () => ({
  getOpenClawDir: () => '/tmp/openclaw',
  getOpenClawEntryPath: () => '/tmp/openclaw/openclaw.mjs',
  isPortableMode: () => mockIsPortableMode.value,
}));

describe('openclaw-cli portable mode', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    setPlatform('darwin');
    mockIsPortableMode.value = true;
  });

  afterEach(() => {
    Object.defineProperty(process, 'platform', { value: originalPlatform, writable: true });
    mockIsPortableMode.value = false;
  });

  it('skips auto install in portable mode', async () => {
    const { autoInstallCliIfNeeded } = await import('@electron/utils/openclaw-cli');
    await expect(autoInstallCliIfNeeded()).resolves.toBeUndefined();
  });

  it('rejects manual CLI install in portable mode', async () => {
    const { installOpenClawCli } = await import('@electron/utils/openclaw-cli');
    await expect(installOpenClawCli()).resolves.toEqual({
      success: false,
      error: 'CLI install is disabled in portable mode.',
    });
  });
});
