/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GOOGLE_CLIENT_ID: string;
  readonly VITE_GOOGLE_CLIENT_ID_IOS: string;
  readonly VITE_GOOGLE_CLIENT_ID_ANDROID: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
