/**
 * Redirect Electron userData before the rest of the main process initializes.
 */
import { app } from 'electron';
import { PORTABLE_GATEWAY_PORT, PORTS } from '../utils/config';
import { bootstrapPortableRuntime } from '../utils/portable-runtime';
import { getSetting, setSetting } from '../utils/store';

const portable = bootstrapPortableRuntime({
  execPath: process.execPath,
  resourcesPath: process.resourcesPath,
});

if (portable.enabled) {
  app.setPath('userData', portable.pingclawDataDir);
  void seedPortableGatewayPort();
}

async function seedPortableGatewayPort(): Promise<void> {
  try {
    const current = await getSetting('gatewayPort');
    if (current === PORTS.OPENCLAW_GATEWAY) {
      await setSetting('gatewayPort', PORTABLE_GATEWAY_PORT);
    }
  } catch {
    // store not ready yet; env default still applies
  }
}
