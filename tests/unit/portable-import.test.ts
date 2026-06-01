import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  countOpenClawEntries,
  getHostOpenClawDir,
  openClawDirHasUserData,
} from '@electron/utils/portable-import';

describe('portable-import helpers', () => {
  let tempRoot: string;

  beforeEach(() => {
    tempRoot = mkdtempSync(join(tmpdir(), 'pingclaw-import-test-'));
  });

  afterEach(() => {
    rmSync(tempRoot, { recursive: true, force: true });
  });

  it('detects user data from openclaw.json and agent folders', () => {
    expect(openClawDirHasUserData(tempRoot)).toBe(false);

    writeFileSync(join(tempRoot, 'openclaw.json'), '{"agents":{}}\n', 'utf8');
    expect(openClawDirHasUserData(tempRoot)).toBe(true);
  });

  it('counts nested entries without hidden files', () => {
    mkdirSync(join(tempRoot, 'agents', 'default', 'sessions'), { recursive: true });
    writeFileSync(join(tempRoot, 'agents', 'default', 'sessions', 'a.jsonl'), '[]\n', 'utf8');
    writeFileSync(join(tempRoot, '.hidden'), 'x', 'utf8');

    expect(countOpenClawEntries(tempRoot)).toBe(4);
  });

  it('resolves host openclaw dir from real home', () => {
    expect(getHostOpenClawDir()).toMatch(/\.openclaw$/);
  });
});
