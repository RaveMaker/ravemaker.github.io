import config from '../../site.config.json';

export function GET() {
  return new Response(`User-agent: *\nAllow: /\nSitemap: ${config.url}/sitemap.xml\n`, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' }
  });
}
