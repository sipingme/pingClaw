/**
 * One-time migration from host ~/.openclaw into portable USB data/openclaw.
 */
import { existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { cpSyncSafe } from './plugin-install';
import { getOpenClawConfigDir, isPortableMode } from './paths';
import { getSetting, setSetting } from './store';

export type PortableHostImportState = 'pending' | 'imported' | 'skipped';

export interface PortableImportStatus {
  enabled: boolean;
  offerImport: boolean;
  canImportFromHost: boolean;
  hostOpenClawDir: string;
  portableOpenClawDir: string;
  hostHasData: boolean;
  portableHasData: boolean;
  hostImportState: PortableHostImportState;
  hostFileCount: number;
}

const USER_DATA_MARKERS = ['agents', 'skills', 'extensions', 'media', 'workspaces', 'sessions'] as const;

export function getHostOpenClawDir(): string {
  return join(homedir(), '.openclaw');
}

export function openClawDirHasUserData(dir: string): boolean {
  if (!existsSync(dir)) {
    return false;
  }

  const configPath = join(dir, 'openclaw.json');
  if (existsSync(configPath) && statSync(configPath).size > 2) {
    return true;
  }

  for (const name of USER_DATA_MARKERS) {
    const markerPath = join(dir, name);
    if (existsSync(markerPath) && readdirSync(markerPath).length > 0) {
      return true;
    }
  }

  return false;
}

export function countOpenClawEntries(dir: string, maxDepth = 4): number {
  if (!existsSync(dir)) {
    return 0;
  }

  let count = 0;

  const walk = (current: string, depth: number): void => {
    if (depth > maxDepth) {
      return;
    }
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      if (entry.name.startsWith('.')) {
        continue;
      }
      count += 1;
      if (entry.isDirectory()) {
        walk(join(current, entry.name), depth + 1);
      }
    }
  };

  walk(dir, 0);
  return count;
}

function copyOpenClawTree(src: string, dest: string): void {
  mkdirSync(dest, { recursive: true });
  for (const entry of readdirSync(src, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) {
      continue;
    }
    const srcChild = join(src, entry.name);
    const destChild = join(dest, entry.name);
    cpSyncSafe(srcChild, destChild);
  }
}

export async function getPortableImportStatus(): Promise<PortableImportStatus> {
  const enabled = isPortableMode();
  const hostOpenClawDir = getHostOpenClawDir();
  const portableOpenClawDir = getOpenClawConfigDir();
  const hostHasData = openClawDirHasUserData(hostOpenClawDir);
  const portableHasData = openClawDirHasUserData(portableOpenClawDir);
  const hostImportState = (await getSetting('portableHostImport')) ?? 'pending';

  const canImportFromHost = enabled
    && hostHasData
    && !portableHasData
    && hostImportState !== 'imported';

  const offerImport = canImportFromHost && hostImportState === 'pending';

  return {
    enabled,
    offerImport,
    canImportFromHost,
    hostOpenClawDir,
    portableOpenClawDir,
    hostHasData,
    portableHasData,
    hostImportState,
    hostFileCount: hostHasData ? countOpenClawEntries(hostOpenClawDir) : 0,
  };
}

export async function dismissPortableHostImport(): Promise<void> {
  await setSetting('portableHostImport', 'skipped');
}

export async function importHostOpenClawToPortable(options: {
  stopGateway?: () => Promise<void>;
  startGateway?: () => Promise<void>;
} = {}): Promise<{ success: boolean; error?: string; copiedEntries?: number }> {
  if (!isPortableMode()) {
    return { success: false, error: 'Import is only available in portable mode.' };
  }

  const status = await getPortableImportStatus();
  if (!status.hostHasData) {
    return { success: false, error: 'No OpenClaw data found on this computer.' };
  }
  if (status.portableHasData) {
    return { success: false, error: 'Portable OpenClaw data already exists on this drive.' };
  }
  if (status.hostImportState === 'imported') {
    return { success: false, error: 'Host data was already imported.' };
  }

  const hostDir = status.hostOpenClawDir;
  const portableDir = status.portableOpenClawDir;
  const copiedEntries = countOpenClawEntries(hostDir);

  if (options.stopGateway) {
    await options.stopGateway();
  }

  try {
    copyOpenClawTree(hostDir, portableDir);
    await setSetting('portableHostImport', 'imported');
    return { success: true, copiedEntries };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    if (options.startGateway) {
      await options.startGateway();
    }
  }
}
