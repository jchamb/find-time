import { makeDurableObject, makeWorker } from '@livestore/sync-cf/cf-worker';

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
export default makeWorker({
  durableObject: {
    name: 'SYNC_BACKEND_DO',
  },
  validatePayload: (payload: any) => {
    if (!payload || typeof payload !== 'object' || !('authToken' in payload)) {
      throw new Error('Missing authToken in sync payload');
    }

    const token = payload.authToken as string;
    const validToken = 'insecure-token-change-me';

    if (token !== validToken) {
      throw new Error('Invalid auth token');
    }
  },
});
