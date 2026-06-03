import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('gateway-port', () => {
  let previousEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    vi.resetModules();
    previousEnv = { ...process.env };
    delete process.env.PINGCLAW_GATEWAY_PORT;
    delete process.env.PINGCLAW_PORTABLE;
    delete process.env.PINGCLAW_PORTABLE_ROOT;
  });

  afterEach(() => {
    process.env = previousEnv;
  });

  it('uses portable default 18889 when portable mode is enabled', async () => {
    process.env.PINGCLAW_PORTABLE = '1';
    process.env.PINGCLAW_PORTABLE_ROOT = '/tmp/usb';
    const { resolveGatewayPortSync, PORTABLE_GATEWAY_PORT } = await import('@electron/utils/gateway-port');
    expect(resolveGatewayPortSync()).toBe(PORTABLE_GATEWAY_PORT);
    expect(PORTABLE_GATEWAY_PORT).toBe(18889);
  });

  it('uses desktop default 18789 outside portable mode', async () => {
    const { resolveGatewayPortSync, DESKTOP_GATEWAY_PORT } = await import('@electron/utils/gateway-port');
    expect(resolveGatewayPortSync()).toBe(DESKTOP_GATEWAY_PORT);
    expect(DESKTOP_GATEWAY_PORT).toBe(18789);
  });

  it('respects PINGCLAW_GATEWAY_PORT override', async () => {
    process.env.PINGCLAW_GATEWAY_PORT = '19999';
    const { resolveGatewayPortSync } = await import('@electron/utils/gateway-port');
    expect(resolveGatewayPortSync()).toBe(19999);
  });

  it('includes desktop and portable ports in control UI URL patterns', async () => {
    const { getGatewayControlUiUrlPatterns } = await import('@electron/utils/gateway-port');
    const patterns = getGatewayControlUiUrlPatterns();
    expect(patterns).toContain('http://127.0.0.1:18789/*');
    expect(patterns).toContain('http://127.0.0.1:18889/*');
  });
});
