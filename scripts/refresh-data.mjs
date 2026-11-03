import { readFile, mkdir, writeFile, rename } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { fetchRepositories } from './github.mjs';

const root = new URL('../', import.meta.url);
// Nothing is written until every account and page has succeeded.
async function refreshData() {
  const config = JSON.parse(await readFile(new URL('site.config.json', root), 'utf8'));
  const snapshot = await fetchRepositories(config.accounts, { token: process.env.GH_TOKEN || process.env.GITHUB_TOKEN });
  if (!snapshot.repositories.length) throw new Error('GitHub returned no public repositories; keeping the existing snapshot.');
  await mkdir(new URL('.cache/', root), { recursive: true });
  const temporary = new URL('.cache/repos.tmp.json', root);
  const destination = new URL('.cache/repos.json', root);
  await writeFile(temporary, `${JSON.stringify(snapshot, null, 2)}\n`);
  await rename(temporary, destination);
  console.log(`Saved ${snapshot.repositories.length} public repositories from ${snapshot.accounts.length} accounts using ${snapshot.requestCount} requests.`);
  console.log(fileURLToPath(destination));
}

await refreshData().catch(error => {
  console.error(`Refresh failed: ${error.message}`);
  process.exitCode = 1;
});
