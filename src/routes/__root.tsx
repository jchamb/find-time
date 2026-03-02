import { createRootRoute, Outlet } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/router-devtools';
import { makeInMemoryAdapter, makePersistedAdapter } from '@livestore/adapter-web';
import LiveStoreSharedWorker from '@livestore/adapter-web/shared-worker?sharedworker';
import { LiveStoreProvider } from '@livestore/react';
import { makeCfSync } from '@livestore/sync-cf';
import { unstable_batchedUpdates as batchUpdates } from 'react-dom';
import LiveStoreWorker from '../livestore/livestore.worker?worker';
import { schema } from '../livestore/schema';
import styles from './__root.module.css';

// Static store ID - all users connect to the same store for collaboration
const STORE_ID = 'find-time-app';

const supportsPersistedAdapter = () => {
  if (typeof window === 'undefined') {
    return false;
  }

  const hasSharedWorker = typeof window.SharedWorker !== 'undefined';
  const hasOpfs = typeof navigator !== 'undefined' && typeof navigator.storage?.getDirectory === 'function';

  return hasSharedWorker && hasOpfs;
};

const makeFallbackAdapter = () => {
  console.warn('[livestore] Falling back to in-memory adapter (SharedWorker and/or OPFS not available in this browser).');

  return makeInMemoryAdapter({
    sync: {
      backend: makeCfSync({ url: import.meta.env.VITE_LIVESTORE_SYNC_URL }),
      initialSyncOptions: { _tag: 'Blocking', timeout: 5000 },
    },
  });
};

const shouldUsePersistedAdapter =
  import.meta.env.VITE_LIVESTORE_FORCE_PERSISTED === '1' ||
  (!import.meta.env.DEV && supportsPersistedAdapter());

const adapter = shouldUsePersistedAdapter
  ? makePersistedAdapter({
      storage: { type: 'opfs' },
      worker: LiveStoreWorker,
      sharedWorker: LiveStoreSharedWorker,
    })
  : makeFallbackAdapter();

export const Route = createRootRoute({
  component: () => (
    <LiveStoreProvider
      schema={schema}
      adapter={adapter}
      storeId={STORE_ID}
      syncPayload={{ authToken: import.meta.env.VITE_LIVESTORE_SYNC_AUTH_TOKEN || 'dev-token' }}
      batchUpdates={batchUpdates}
      renderLoading={(status) => (
        <div className={styles.loadingShell} aria-live="polite" aria-busy="true">
          <div className={styles.loadingCard}>
            <span className={styles.spinner} aria-hidden="true" />
            <h2 className={styles.loadingTitle}>Starting your collaboration workspace…</h2>
            <p className={styles.loadingDescription}>Syncing your meeting data and preparing LiveStore.</p>
            <p className={styles.loadingStage}>Stage: {status.stage}</p>
          </div>
        </div>
      )}
    >
      <>
        <Outlet />
        {import.meta.env.DEV && <TanStackRouterDevtools />}
      </>
    </LiveStoreProvider>
  ),
});
