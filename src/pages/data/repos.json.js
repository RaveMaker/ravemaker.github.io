import config from '../../../site.config.json';
import { loadSnapshot } from '../../../scripts/snapshot.mjs';

// Astro emits a static JSON file at build time, not a deployed server endpoint.
export async function GET() {
  return new Response(`${JSON.stringify(await loadSnapshot(config.accounts))}\n`, {
    headers: { 'Content-Type': 'application/json; charset=utf-8' }
  });
}
