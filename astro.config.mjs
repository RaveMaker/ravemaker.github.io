import { defineConfig } from 'astro/config';
import { resolve } from 'node:path';
import config from './site.config.json' with { type: 'json' };

export default defineConfig({
  site: config.url,
  output: 'static',
  server: { port: 5173 },
  vite: {
    plugins: [{
      name: 'repository-snapshot-reload',
      configureServer(server) {
        const snapshots = ['.cache/repos.json', 'data/repos.json'].map(path => resolve(path));
        server.watcher.add(snapshots);
        const reload = path => { if (snapshots.includes(resolve(path))) server.ws.send({ type: 'full-reload' }); };
        server.watcher.on('change', reload);
        server.watcher.on('add', reload);
        server.watcher.on('unlink', reload);
      }
    }]
  }
});
