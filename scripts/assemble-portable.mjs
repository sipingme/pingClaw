#!/usr/bin/env node
/**
 * Assemble PingClawPortable USB bundles after electron-builder.
 *
 * Usage:
 *   node scripts/assemble-portable.mjs mac
 *   node scripts/assemble-portable.mjs win
 */

import {
  chmodSync,
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const TEMPLATE = join(ROOT, 'scripts', 'portable', 'template');
const RELEASE = join(ROOT, 'release');
const STAGING = join(RELEASE, '.portable-staging');
const VERSION = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')).version;

function bundleName(platform, arch) {
  return `PingClawPortable-${VERSION}-${platform}-${arch}`;
}

function copyTemplate(outDir) {
  cpSync(TEMPLATE, outDir, { recursive: true });
  writeFileSync(join(outDir, 'VERSION'), `${VERSION}\n`, 'utf8');
  mkdirSync(join(outDir, 'data', 'pingclaw'), { recursive: true });
  mkdirSync(join(outDir, 'data', 'openclaw'), { recursive: true });
  chmodSync(join(outDir, 'Start PingClaw.command'), 0o755);
}

function zipDirectory(sourceDir, zipPath) {
  rmSync(zipPath, { force: true });
  const folderName = basename(sourceDir);
  const parentDir = dirname(sourceDir);

  if (process.platform === 'win32') {
    execFileSync(
      'powershell',
      [
        '-NoProfile',
        '-Command',
        `Compress-Archive -Path '${sourceDir.replace(/'/g, "''")}' -DestinationPath '${zipPath.replace(/'/g, "''")}' -Force`,
      ],
      { stdio: 'inherit' },
    );
    return;
  }

  execFileSync('zip', ['-r', zipPath, folderName], {
    cwd: parentDir,
    stdio: 'inherit',
  });
}

function resolveMacAppPath(arch) {
  const candidates = [
    join(RELEASE, arch === 'arm64' ? 'mac-arm64' : 'mac', 'PingClaw.app'),
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

function assembleMacArch(arch) {
  const appPath = resolveMacAppPath(arch);
  if (!appPath) {
    console.warn(`[assemble-portable] Skip mac-${arch}: PingClaw.app not found`);
    return null;
  }

  const name = bundleName('mac', arch);
  const outDir = join(STAGING, name);
  const zipPath = join(RELEASE, `${name}.zip`);

  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });
  copyTemplate(outDir);
  cpSync(appPath, join(outDir, 'PingClaw.app'), { recursive: true });
  zipDirectory(outDir, zipPath);
  console.log(`[assemble-portable] Created ${zipPath}`);
  return zipPath;
}

function assembleMac() {
  mkdirSync(STAGING, { recursive: true });
  const created = [];
  for (const arch of ['arm64', 'x64']) {
    const zipPath = assembleMacArch(arch);
    if (zipPath) created.push(zipPath);
  }
  if (created.length === 0) {
    throw new Error('No macOS PingClaw.app bundles found under release/');
  }
  return created;
}

function assembleWin() {
  const portableExe = readdirSync(RELEASE)
    .filter((name) => /^PingClawPortable-.*-win-x64\.exe$/i.test(name))
    .sort()
    .at(-1);

  if (!portableExe) {
    throw new Error('No PingClawPortable-*-win-x64.exe found in release/');
  }

  const exePath = join(RELEASE, portableExe);
  const name = bundleName('win', 'x64');
  const outDir = join(STAGING, name);
  const zipPath = join(RELEASE, `${name}.zip`);

  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });
  copyTemplate(outDir);
  cpSync(exePath, join(outDir, portableExe));
  zipDirectory(outDir, zipPath);

  console.log(`[assemble-portable] Windows portable exe: ${exePath}`);
  console.log(`[assemble-portable] Created ${zipPath}`);
  return [exePath, zipPath];
}

function main() {
  const platform = process.argv[2];
  if (!existsSync(TEMPLATE)) {
    throw new Error(`Portable template missing: ${TEMPLATE}`);
  }

  if (platform === 'mac') {
    assembleMac();
    return;
  }

  if (platform === 'win') {
    assembleWin();
    return;
  }

  throw new Error('Usage: node scripts/assemble-portable.mjs <mac|win>');
}

try {
  main();
} catch (error) {
  console.error(`[assemble-portable] ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
