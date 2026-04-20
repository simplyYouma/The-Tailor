/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PROJECT_NAME: string
  readonly VITE_YUMI_HUB_URL: string
  readonly VITE_YUMI_PROJECT_ID: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
