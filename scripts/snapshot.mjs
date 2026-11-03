import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { filterRepositories, totals } from '../src/repositories.js';

export async function loadSnapshot(accounts, root = process.cwd()) {
  let raw;
  try { raw = await readFile(resolve(root, '.cache/repos.json'), 'utf8'); }
  catch (error) { if (error.code !== 'ENOENT') throw error; raw = await readFile(resolve(root, 'data/repos.json'), 'utf8'); }
  const snapshot = JSON.parse(raw);
  if (snapshot.schemaVersion !== 1 || !Array.isArray(snapshot.repositories) || !snapshot.repositories.length || !Number.isFinite(Date.parse(snapshot.generatedAt))) throw new Error('Invalid repository snapshot. Run npm run refresh-data.');
  if (!Array.isArray(snapshot.accounts) || accounts.some(account => !snapshot.accounts.includes(account))) throw new Error('Account configuration changed. Run npm run refresh-data before building.');
  const selectedAccounts = new Set(accounts.map(account => account.toLowerCase()));
  const repositories = snapshot.repositories.filter(repo => selectedAccounts.has(repo.owner?.toLowerCase()));
  if (!repositories.length) throw new Error('No repositories for the configured accounts. Run npm run refresh-data.');
  return { ...snapshot, accounts, repositories };
}

export async function loadProfile(config) {
  const snapshot = await loadSnapshot(config.accounts);
  const repositories = snapshot.repositories;
  const featured = filterRepositories(repositories, { account: config.featured.account, sort: 'stars' }).slice(0, config.featured.limit);
  if (featured.length !== config.featured.limit) throw new Error(`Not enough featured repositories for ${config.featured.account}.`);
  return { snapshot, repositories, featured, stats: totals(repositories) };
}

export const serializeSnapshot = snapshot => JSON.stringify(snapshot).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
