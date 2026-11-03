import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadSnapshot, serializeSnapshot } from '../scripts/snapshot.mjs';

const snapshot = (stars = 1) => ({ schemaVersion: 1, generatedAt: '2026-11-01T00:00:00Z', accounts: ['RaveMaker'], repositories: [{ fullName: 'RaveMaker/example', stars }] });
test('offline snapshot loads from tracked seed, preferring local refresh when present', async t => {
  const root = await mkdtemp(join(tmpdir(), 'rm-snapshot-'));
  t.after(() => { assert.ok(root.startsWith(join(tmpdir(), 'rm-snapshot-'))); return rm(root, { recursive: true, force: true }); });
  await mkdir(join(root, 'data'));
  await writeFile(join(root, 'data/repos.json'), JSON.stringify(snapshot(1)));
  assert.equal((await loadSnapshot(['RaveMaker'], root)).repositories[0].stars, 1);
  await mkdir(join(root, '.cache'));
  await writeFile(join(root, '.cache/repos.json'), JSON.stringify(snapshot(2)));
  assert.equal((await loadSnapshot(['RaveMaker'], root)).repositories[0].stars, 2);
  await assert.rejects(loadSnapshot(['ERPXE'], root), /Account configuration changed/);
});
test('corrupted local data fails rather than silently publishing an older seed', async t => {
  const root = await mkdtemp(join(tmpdir(), 'rm-snapshot-'));
  t.after(() => { assert.ok(root.startsWith(join(tmpdir(), 'rm-snapshot-'))); return rm(root, { recursive: true, force: true }); });
  await mkdir(join(root, '.cache'));
  await writeFile(join(root, '.cache/repos.json'), '{}');
  await assert.rejects(loadSnapshot(['RaveMaker'], root), /Invalid repository snapshot/);
});
test('embedded JSON cannot close its script element, preserving original text on parsing', () => {
  const data = { description: '</script><script>alert(1)</script>\u2028\u2029' };
  const serialized = serializeSnapshot(data);
  assert.ok(!serialized.includes('<'));
  assert.deepEqual(JSON.parse(serialized), data);
});
