import { spawn } from 'node:child_process';
import net from 'node:net';

import { livestoreDevtoolsPlugin } from '@livestore/devtools-vite';
import { TanStackRouterVite } from '@tanstack/router-plugin/vite';

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    TanStackRouterVite(),
    react(),
    livestoreDevtoolsPlugin({ schemaPath: './src/livestore/schema.ts' }),
    // Running `wrangler dev` as part of `vite dev` needed for `@livestore/sync-cf`
    {
      name: 'wrangler-dev',
      configureServer: async server => {
        const syncUrl = process.env.VITE_LIVESTORE_SYNC_URL || 'ws://localhost:8787';
        let port = 8787;
        let host = '127.0.0.1';

        try {
          const parsed = new URL(syncUrl);
          port = Number(parsed.port || (parsed.protocol === 'wss:' || parsed.protocol === 'https:' ? 443 : 80));
          host = parsed.hostname || host;
        } catch {
          // Fall back to defaults if URL parsing fails.
        }

        const shouldSpawnWrangler = await new Promise<boolean>(resolve => {
          const socket = net.createConnection({ host, port });
          socket.on('connect', () => {
            socket.destroy();
            resolve(false);
          });
          socket.on('error', () => resolve(true));
        });

        if (!shouldSpawnWrangler) {
          console.warn(
            `[livestore] Sync backend already running on ${host}:${port}. Skipping wrangler dev spawn.`,
          );
          return;
        }

        const wrangler = spawn('./node_modules/.bin/wrangler', ['dev', '--port', String(port)], {
          stdio: ['ignore', 'inherit', 'inherit'],
        });

        const shutdown = () => {
          if (wrangler.killed === false) {
            wrangler.kill();
          }
          process.exit(0);
        };

        server.httpServer?.on('close', shutdown);
        process.on('SIGTERM', shutdown);
        process.on('SIGINT', shutdown);

        wrangler.on('exit', code => console.error(`wrangler dev exited with code ${code}`));
      },
    },
  ],
});
