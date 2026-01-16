// This file must not export or import anything on top-level

/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_OC_WEB_LOG_LEVEL?: 'debug' | 'info' | 'warn' | 'error'
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module '*?worker' {
  const content: string
  export default content
}
