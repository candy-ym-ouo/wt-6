/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_TITLE: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
  readonly hot?: {
    accept: (deps?: string | readonly string[], callback?: (modules: any) => void) => void
    dispose: (callback: (data: any) => void) => void
  }
}
