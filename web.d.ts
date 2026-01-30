/// <reference types="vite/client" />

// This file must have at least one export or import on top-level
export {}

declare global {
  interface Window {
    WEB_APPS_MAP: Record<string, string>
  }
}
