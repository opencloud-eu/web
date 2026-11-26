// Vite config for the PDF viewer app (packages/web-app-pdf-viewer), which is based on PDF.js.

import { createRequire } from 'module'
import { dirname, relative, sep } from 'path'
import type { Alias, Plugin } from 'vite'
import type { Target } from 'vite-plugin-static-copy'

const root = dirname(dirname(import.meta.dirname))

// pdfjs-dist is a dependency of the app, not of the root
const pdfjsPackageJson = createRequire(`${root}/packages/web-app-pdf-viewer/package.json`).resolve(
  'pdfjs-dist/package.json'
)
const pdfjsDir = relative(root, dirname(pdfjsPackageJson)).split(sep)
const { version: pdfjsVersion } = createRequire(import.meta.url)(pdfjsPackageJson)

/**
 * The legacy build of PDF.js brings polyfills for older browsers, the modern one uses e.g.
 * `Map.prototype.getOrInsertComputed` and `Math.sumPrecise` unguarded. It still needs
 * `Promise.withResolvers` (Chrome 119, Firefox 121, Safari 17.4). The types are the same.
 */
export const pdfjsLegacyAliases: Alias[] = [
  { find: /^pdfjs-dist$/, replacement: 'pdfjs-dist/legacy/build/pdf.mjs' },
  {
    find: /^pdfjs-dist\/web\/pdf_viewer\.mjs$/,
    replacement: 'pdfjs-dist/legacy/web/pdf_viewer.mjs'
  }
]

/**
 * PDF.js loads its worker, CMaps, standard fonts, image decoders and annotation icons at runtime.
 * They get copied to `pdfjs/<version>/` next to index.html, so nothing is fetched from a CDN,
 * which the CSP would block anyway, and a cached worker of another version can't be used after
 * an update. See packages/web-app-pdf-viewer/src/helpers/pdfjs.ts for the lookup side.
 */
export function pdfjsAssetTargets(): Target[] {
  return [
    ...['legacy/build/pdf.worker.min.mjs', 'cmaps', 'standard_fonts', 'legacy/web/images'].map(
      (src) => ({
        src: [...pdfjsDir, src].join('/'),
        dest: `pdfjs/${pdfjsVersion}`,
        // keep only the last directory of folders, e.g. `images`
        rename: { stripBase: pdfjsDir.length + src.split('/').length - 1 }
      })
    ),
    {
      // Only the JavaScript versions of the image decoders with their licenses, PDF.js runs
      // without WebAssembly here.
      src: [...pdfjsDir, 'wasm/{*_nowasm_fallback.js,LICENSE_*JBIG2,LICENSE_*OPENJPEG}'].join('/'),
      dest: `pdfjs/${pdfjsVersion}`,
      rename: { stripBase: pdfjsDir.length }
    }
  ]
}

/**
 * pdf_viewer.css declares its variables and `color-scheme: light dark` on `:root`, which would
 * leak into the whole UI. Scope them to the viewer instead, where `color-scheme` follows the
 * OpenCloud theme (see PdfViewer.vue).
 */
export function scopePdfjsCss(): Plugin {
  return {
    name: 'scope-pdfjs-css',
    enforce: 'pre',
    transform(code, id) {
      if (!id.includes('pdfjs-dist/web/pdf_viewer.css')) {
        return
      }
      // PDF.js reads these from `document.documentElement` in JS (e.g. to place new text
      // annotations), so they have to stay on the actual root element.
      const rootVariables = ['--outline-width', '--freetext-padding']
        .map((name) => {
          const value = code.match(new RegExp(`${name}:\\s*([^;]+);`))?.[1]
          if (!value) {
            this.error(`${name} is missing in pdf_viewer.css, see scopePdfjsCss`)
          }
          return `${name}: ${value};`
        })
        .join(' ')
      return {
        code: code.replaceAll(':root', '.pdf-viewer') + `\n:root { ${rootVariables} }\n`,
        map: null
      }
    }
  }
}
