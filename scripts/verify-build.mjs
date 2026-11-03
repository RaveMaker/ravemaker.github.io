import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { filterRepositories, escapeHtml } from '../src/repositories.js';

const root = new URL('../', import.meta.url);
const config = JSON.parse(await readFile(new URL('site.config.json', root), 'utf8'));
const html = await readFile(new URL('dist/index.html', root), 'utf8');
const snapshot = JSON.parse(await readFile(new URL('dist/data/repos.json', root), 'utf8'));
const embedded = JSON.parse(html.match(/<script[^>]*id="repository-data"[^>]*>([\s\S]*?)<\/script>/)[1]);
assert.deepEqual(embedded, snapshot, 'Page data must match the public static snapshot');
assert.equal((html.match(/class="repo-row"/g) || []).length, snapshot.repositories.length, 'All repos must be available without JavaScript');
assert.ok(html.includes(escapeHtml(config.intro)), 'Current intro must be preserved');
const highlights = [...html.matchAll(/<a class="featured-card" href="([^"]+)"/g)].map(match => match[1]);
const expected = filterRepositories(snapshot.repositories, { account: config.featured.account, sort: 'stars' }).slice(0, config.featured.limit).map(repo => repo.url);
assert.deepEqual(highlights, expected, 'Highlights must be the most-starred RaveMaker repositories');
assert.equal((html.match(/role="tab"/g) || []).length, config.accounts.length, 'Each account needs one tab');
assert.ok(!html.includes('select name="status"'), 'Repository type dropdown must remain removed');
assert.ok(!html.includes('{{'), 'Legacy template placeholders must not be emitted');
const assets = [...html.matchAll(/(?:src|href)="(\/_astro\/[^"?#]+)"/g)].map(match => match[1]);
assert.ok(assets.some(path => path.endsWith('.css')), 'Astro must emit the stylesheet');
assert.ok(assets.some(path => path.endsWith('.js')), 'Astro must emit the interaction bundle');
for (const path of assets) {
  const asset = new URL(`dist${path}`, root);
  await access(asset);
  if (path.endsWith('.js')) {
    const js = await readFile(asset, 'utf8');
    assert.ok(!js.includes('api.github.com'), 'Browser bundle must not access GitHub API');
    assert.ok(!js.includes('/__events'), 'Legacy dev client must not be bundled');
  }
}
for (const file of ['favicon.png', 'apple-touch-icon.png', '.nojekyll', 'robots.txt', 'sitemap.xml']) await access(new URL(`dist/${file}`, root));
console.log(`Verified Astro artifact: ${snapshot.repositories.length} prerendered repositories, ${highlights.length} ranked highlights, ${config.accounts.length} account tabs, matching JSON, and bundled assets.`);
