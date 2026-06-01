/**
 * Redirect Electron userData before the rest of the main process initializes.
 */
import { app } from 'electron';
import { bootstrapPortableRuntime } from '../utils/portable-runtime';

const portable = bootstrapPortableRuntime({
  execPath: process.execPath,
  resourcesPath: process.resourcesPath,
});

if (portable.enabled) {
  app.setPath('userData', portable.pingclawDataDir);
}
