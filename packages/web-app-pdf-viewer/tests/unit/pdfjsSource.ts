import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

/**
 * The code of PDF.js itself, to check what the app provides to it against what it uses. These
 * checks fail when a PDF.js update changes that, instead of PDF.js silently doing without.
 */
const source = ['pdfjs-dist/legacy/build/pdf.mjs', 'pdfjs-dist/legacy/web/pdf_viewer.mjs']
  .map((path) => readFileSync(require.resolve(path), 'utf8'))
  .join('\n')

/** The code of PDF.js' worker, apart from `source`: the app passes nothing to it. */
const workerSource = readFileSync(require.resolve('pdfjs-dist/legacy/build/pdf.worker.mjs'), 'utf8')

/**
 * What PDF.js reads or calls on a manager the app passes to its viewer, e.g. `commentManager`.
 * Found by name, so it's a lower bound: calls through another variable aren't found.
 */
export function getUsedMembers(manager: string) {
  const pattern = new RegExp(`(?:^|[^\\w$])[#_]?${manager}\\??\\.(\\w+)`, 'g')
  return [...new Set([...source.matchAll(pattern)].map(([, member]) => member))].sort()
}

/** The members of a manager the app passes that PDF.js uses but the app doesn't provide. */
export function getMissingMembers(managerName: string, manager: object) {
  const used = getUsedMembers(managerName)
  // Not found at all: PDF.js renamed the manager, the check would pass without checking.
  if (!used.length) {
    throw new Error(`PDF.js doesn't use ${managerName} anymore`)
  }
  return used.filter((member) => !(member in manager))
}

/** Whether PDF.js has the string, e.g. a text id like `pdfjs-free-text2` or a class name. */
export function hasString(value: string) {
  return [`"${value}"`, `'${value}'`, `\`${value}\``].some((quoted) => includesCode(quoted))
}

/** Whether PDF.js' code includes the text, e.g. `className = "page"`. */
export function includesCode(text: string) {
  return source.includes(text)
}

/** How often PDF.js' code includes the text. */
export function countCode(text: string) {
  return source.split(text).length - 1
}

/** Whether the code of PDF.js' worker includes the text. */
export function includesWorkerCode(text: string) {
  return workerSource.includes(text)
}

/** How often the code of PDF.js' worker includes the text. */
export function countWorkerCode(text: string) {
  return workerSource.split(text).length - 1
}
