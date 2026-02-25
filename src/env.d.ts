/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_LIVESTORE_SYNC_URL: string;
  readonly VITE_LIVESTORE_SYNC_AUTH_TOKEN: string;
}

declare global {
  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}

export {};
