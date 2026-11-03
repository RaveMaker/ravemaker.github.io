import config from '../../site.config.json';
import { loadSnapshot } from '../../scripts/snapshot.mjs';
import { escapeHtml } from '../repositories.js';

export async function GET() {
  const snapshot = await loadSnapshot(config.accounts);
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${escapeHtml(config.url)}/</loc><lastmod>${snapshot.generatedAt.slice(0, 10)}</lastmod></url></urlset>\n`, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' }
  });
}
