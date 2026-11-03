import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchRepositories } from '../scripts/github.mjs';
import { DEFAULT_FILTERS, countLabel, filterRepositories, totals, renderRepository } from '../src/repositories.js';

const raw = (id, extra = {}) => ({ id, owner: { login: 'ERPXE' }, name: `repo-${id}`, full_name: `ERPXE/repo-${id}`, html_url: `https://github.com/ERPXE/repo-${id}`, description: 'Network boot', stargazers_count: 2, forks_count: 1, fork: false, archived: false, disabled: false, language: 'Shell', pushed_at: '2026-10-01T00:00:00Z', updated_at: '2026-10-01T00:00:00Z', created_at: '2012-01-01T00:00:00Z', ...extra });
test('follows pagination, excludes private repos, and produces public-only snapshot', async () => {
  const calls = [];
  const result = await fetchRepositories(['ERPXE'], { now: new Date('2026-11-01T00:00:00Z'), token: 'test-token', fetchImpl: async (url, options) => {
    calls.push(url);
    assert.equal(options.headers.Authorization, 'Bearer test-token');
    return calls.length === 1
      ? new Response(JSON.stringify([raw(1), raw(3, { private: true })]), { headers: { link: '<https://api.github.com/users/ERPXE/repos?page=2>; rel="next"' } })
      : new Response(JSON.stringify([raw(2)]));
  } });
  assert.equal(result.requestCount, 2);
  assert.equal(result.repositories.length, 2);
  assert.equal(result.generatedAt, '2026-11-01T00:00:00.000Z');
  assert.ok(!JSON.stringify(result).includes('test-token'));
  assert.deepEqual(totals(result.repositories), { repositories: 2, stars: 4, forks: 2 });
});
test('fails the entire refresh if a later account fails', async () => {
  let calls = 0;
  await assert.rejects(fetchRepositories(['ERPXE', 'ITekBlog'], { fetchImpl: async () => ++calls === 1 ? new Response(JSON.stringify([raw(1)])) : new Response('{}', { status: 403 }) }), /403 for ITekBlog/);
});
test('search combines words, account, language, and sort without mutating data', () => {
  const repos = [
    { id: 1, owner: 'ERPXE', name: 'boot', fullName: 'ERPXE/boot', description: 'Network recovery', language: 'Shell', stars: 5, fork: false, archived: false, topics: ['pxe'], pushedAt: '2026-01-01' },
    { id: 2, owner: 'ERPXE', name: 'old', fullName: 'ERPXE/old', description: 'Network boot', language: null, stars: 20, fork: false, archived: true, pushedAt: '2026-10-01' },
    { id: 3, owner: 'RaveMaker', name: 'fork', fullName: 'RaveMaker/fork', description: 'Network boot', language: 'Shell', stars: 8, fork: true, archived: false, pushedAt: '2026-11-01' }
  ];
  assert.deepEqual(filterRepositories(repos, { query: 'network pxe', account: 'erpxe', language: 'Shell' }).map(r => r.id), [1]);
  assert.deepEqual(filterRepositories(repos, { language: 'Unspecified' }).map(r => r.id), [2]);
  assert.deepEqual(filterRepositories(repos, { sort: 'stars' }).map(r => r.id), [2, 3, 1]);
  assert.deepEqual(repos.map(r => r.id), [1, 2, 3]);
});
test('shared defaults restore the complete account and recent-push ordering', () => {
  assert.deepEqual(DEFAULT_FILTERS, { query: '', language: '', sort: 'pushed' });
  assert.ok(Object.isFrozen(DEFAULT_FILTERS));
  const repos = [
    { owner: 'RaveMaker', name: 'docker', fullName: 'RaveMaker/docker', description: '', language: 'Shell', stars: 9, pushedAt: '2020-01-01' },
    { owner: 'RaveMaker', name: 'new', fullName: 'RaveMaker/new', description: '', language: 'JavaScript', stars: 0, pushedAt: '2026-01-01' },
    { owner: 'ERPXE', name: 'other', fullName: 'ERPXE/other', description: '', language: 'Shell', stars: 10, pushedAt: '2026-02-01' }
  ];
  assert.equal(filterRepositories(repos, { query: 'docker', account: 'RaveMaker' }).length, 1);
  assert.deepEqual(filterRepositories(repos, { ...DEFAULT_FILTERS, account: 'RaveMaker' }).map(repo => repo.name), ['new', 'docker']);
});
test('refresh rejects an empty account, including responses containing only private or foreign repos', async () => {
  for (const response of [[], [raw(1, { private: true })], [raw(1, { owner: { login: 'SomeoneElse' } })]]) {
    await assert.rejects(fetchRepositories(['ERPXE'], { fetchImpl: async () => new Response(JSON.stringify(response)) }), /No public owned repositories returned for ERPXE/);
  }
  let calls = 0;
  await assert.rejects(fetchRepositories(['ERPXE', 'ITekBlog'], { fetchImpl: async () => new Response(JSON.stringify(++calls === 1 ? [raw(1)] : [])) }), /No public owned repositories returned for ITekBlog/);
});
test('metric labels are visible to screen readers and pluralize correctly', () => {
  assert.equal(countLabel(1, 'star'), ' star');
  assert.equal(countLabel(0, 'star'), ' stars');
  const html = renderRepository({ owner: 'RaveMaker', name: 'example', url: 'https://github.com/RaveMaker/example', stars: 1, forks: 2 });
  assert.ok(html.includes('<span class="sr-only"> star</span>'));
  assert.ok(html.includes('<span class="sr-only"> forks</span>'));
  assert.ok(!html.includes('aria-label="1 stars"'));
});
test('escapes remote repository content and rejects non-GitHub links', () => {
  // Deliberately unsafe input, assembled to avoid IDE HTML inspections on a test fixture.
  const hostileDescription = ['<', 'img src=x onerror=alert(1)>'].join('');
  const html = renderRepository({ owner: 'RaveMaker', name: '<script>', description: hostileDescription, url: 'javascript:alert(1)', language: null, stars: 0, forks: 0, topics: ['" onclick="bad'], pushedAt: null });
  assert.ok(!html.includes('<script>'));
  assert.ok(!html.includes('<img'));
  assert.ok(!html.includes('javascript:'));
  assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(html.includes('https://github.com'));
});
