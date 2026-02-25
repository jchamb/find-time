import { createRootRoute, Outlet } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/router-devtools';
import { makePersistedAdapter } from '@livestore/adapter-web';
import LiveStoreSharedWorker from '@livestore/adapter-web/shared-worker?sharedworker';
import { LiveStoreProvider } from '@livestore/react';
import { unstable_batchedUpdates as batchUpdates } from 'react-dom';
import LiveStoreWorker from '../livestore/livestore.worker?worker';
import { schema } from '../livestore/schema';

// Static store ID - all users connect to the same store for collaboration
const STORE_ID = 'find-time-app';

const adapter = makePersistedAdapter({
  storage: { type: 'opfs' },
  worker: LiveStoreWorker,
  sharedWorker: LiveStoreSharedWorker,
});

export const Route = createRootRoute({
  component: () => (
    <LiveStoreProvider
      schema={schema}
      adapter={adapter}
      storeId={STORE_ID}
      syncPayload={{ authToken: import.meta.env.VITE_LIVESTORE_SYNC_AUTH_TOKEN || 'dev-token' }}
      batchUpdates={batchUpdates}
    >
      <>
        <Outlet />
        {import.meta.env.DEV && <TanStackRouterDevtools />}
      </>
    </LiveStoreProvider>
  ),
});
