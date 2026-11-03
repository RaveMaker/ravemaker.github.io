import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

const layout = await readFile(new URL('../src/layouts/PageLayout.astro', import.meta.url), 'utf8');
const initialization = layout.match(/<script is:inline>([\s\S]*?)<\/script>/)[1];

test('initial theme follows the OS unless a valid manual preference exists', () => {
  for (const [saved, light, expected] of [
    [null, true, 'light'], [null, false, 'dark'],
    ['invalid', true, 'light'], ['dark', true, 'dark'], ['light', false, 'light']
  ]) {
    const root = { dataset: {} };
    const meta = {};
    runInNewContext(initialization, {
      document: { documentElement: root, querySelector: () => meta },
      localStorage: { getItem: () => saved },
      matchMedia: () => ({ matches: light })
    });
    assert.equal(root.dataset.theme, expected);
    assert.equal(meta.content, expected === 'light' ? '#f7f8fa' : '#0c111b');
  }
});

test('OS theme still applies when localStorage is unavailable', () => {
  const root = { dataset: {} };
  const meta = {};
  runInNewContext(initialization, {
    document: { documentElement: root, querySelector: () => meta },
    localStorage: { getItem() { throw new Error('Storage blocked'); } },
    matchMedia: () => ({ matches: true })
  });
  assert.equal(root.dataset.theme, 'light');
  assert.equal(meta.content, '#f7f8fa');
});
