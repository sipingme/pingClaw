/**
 * Gateway port resolution for desktop vs portable installs.
 */
import { PORTABLE_GATEWAY_PORT, PORTS } from './config';
import { isPortableMode } from './portable-runtime';

/** Desktop / OpenClaw CLI default gateway port. */
export const DESKTOP_GATEWAY_PORT = PORTS.OPENCLAW_GATEWAY;

export { PORTABLE_GATEWAY_PORT };

function parsePort(value: string | undefined): number | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  const parsed = Number.parseInt(trimmed, 10);
  if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 65535) {
    return null;
  }
  return parsed;
}

export function resolveGatewayPortSync(): number {
  const fromEnv = parsePort(process.env.PINGCLAW_GATEWAY_PORT);
  if (fromEnv != null) {
    return fromEnv;
  }
  if (isPortableMode()) {
    return PORTABLE_GATEWAY_PORT;
  }
  return DESKTOP_GATEWAY_PORT;
}

export function getGatewayControlUiUrlPatterns(): string[] {
  const ports = new Set<number>([DESKTOP_GATEWAY_PORT, PORTABLE_GATEWAY_PORT]);
  ports.add(resolveGatewayPortSync());
  return [...ports].flatMap((port) => [
    `http://127.0.0.1:${port}/*`,
    `http://localhost:${port}/*`,
  ]);
}
