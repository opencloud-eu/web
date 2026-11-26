import { getDocument, GlobalWorkerOptions, PasswordResponses, version } from 'pdfjs-dist'
import type { PDFDocumentLoadingTask } from 'pdfjs-dist'

// The build copies them to `pdfjs/<version>/` next to index.html (see dev/vite-plugins/pdfjs.ts),
// so they resolve against the document like the icons, regardless of the path OpenCloud is
// mounted under. The version keeps a cached worker of another version from being used.
const assetBaseUrl = new URL(`pdfjs/${version}/`, document.baseURI).href

// The zoom limits of PDF.js, which doesn't export them.
export const MIN_SCALE = 0.1
export const MAX_SCALE = 25

export const pdfjsAssetUrls = {
  worker: `${assetBaseUrl}pdf.worker.min.mjs`,
  cMaps: `${assetBaseUrl}cmaps/`,
  standardFonts: `${assetBaseUrl}standard_fonts/`,
  wasm: `${assetBaseUrl}wasm/`,
  images: `${assetBaseUrl}images/`
}

export type PasswordRequest = {
  /** True if a previously entered password was wrong. */
  isRetry: boolean
  submit: (password: string) => void
  cancel: () => void
}

/** `data` is transferred to PDF.js' worker, which detaches it. */
export function loadPdfDocument(
  data: ArrayBuffer,
  {
    onPasswordRequest,
    password
  }: {
    onPasswordRequest?: (request: PasswordRequest) => void
    /** Tried first, PDF.js only asks via `onPasswordRequest` if it doesn't fit. */
    password?: string
  } = {}
): PDFDocumentLoadingTask {
  if (!GlobalWorkerOptions.workerSrc) {
    GlobalWorkerOptions.workerSrc = pdfjsAssetUrls.worker
  }

  const loadingTask = getDocument({
    data: new Uint8Array(data),
    password,
    cMapUrl: pdfjsAssetUrls.cMaps,
    cMapPacked: true,
    standardFontDataUrl: pdfjsAssetUrls.standardFonts,
    // WebAssembly stays off, so the viewer behaves the same under any CSP. The image decoders
    // load their JavaScript versions from `wasmUrl` then.
    useWasm: false,
    wasmUrl: pdfjsAssetUrls.wasm,
    // Renders XFA forms (often used by authorities), PDF.js keeps them disabled by default.
    enableXfa: true
  })

  if (onPasswordRequest) {
    loadingTask.onPassword = (updatePassword: (password: string) => void, reason: number) => {
      onPasswordRequest({
        isRetry: reason === PasswordResponses.INCORRECT_PASSWORD,
        submit: updatePassword,
        cancel: () => loadingTask.destroy()
      })
    }
  }

  return loadingTask
}
