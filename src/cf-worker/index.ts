import { handleWebSocket, makeDurableObject } from '@livestore/sync-cf/cf-worker';

type WorkerEnv = {
  [key: string]: unknown;
  SYNC_AUTH_TOKEN?: string;
};

type HandleWebSocketEnv = Parameters<typeof handleWebSocket>[1];
type HandleWebSocketContext = Parameters<typeof handleWebSocket>[2];

/**
 * Durable Object that handles sync events for a single meet (storeId).
 * Backed by Cloudflare D1 for persistence.
 */
export class SyncBackendDO extends makeDurableObject({
  onPush: async () => {
    // Optional: log push events for debugging
  },
  onPull: async () => {
    // Optional: log pull events for debugging
  },
}) {}

/**
 * Main worker fetch handler.
 * Routes sync traffic to the Durable Object backend.
 */
export default {
  fetch: async (request: Request, env: WorkerEnv, ctx: unknown) => {
    const url = new URL(request.url);

    if (request.method === 'GET' && (url.pathname === '/' || url.pathname === '/sync')) {
      return new Response('Info: WebSocket sync backend endpoint for @livestore/sync-cf.', {
        status: 200,
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    if (!url.pathname.endsWith('/websocket')) {
      return new Response('Invalid path', { status: 400 });
    }

    const expectedToken = env.SYNC_AUTH_TOKEN;
    if (!expectedToken) {
      return new Response('SYNC_AUTH_TOKEN is not configured on the worker', { status: 500 });
    }

    return handleWebSocket(request, env as unknown as HandleWebSocketEnv, ctx as HandleWebSocketContext, {
      durableObject: { name: 'SYNC_BACKEND_DO' },
      validatePayload: payload => {
        if (!payload || typeof payload !== 'object' || !('authToken' in payload)) {
          throw new Error('Missing authToken in sync payload');
        }

        const token = (payload as { authToken?: unknown }).authToken;
        if (typeof token !== 'string') {
          throw new Error('Invalid auth token format');
        }

        if (token !== expectedToken) {
          throw new Error('Invalid auth token');
        }
      },
    });
  },
};
