import { readFileSync, lstatSync, readdirSync } from 'fs'
import { Page } from '@playwright/test'

// Node-side upload descriptor; named distinctly so it doesn't shadow the DOM `File` used in page.evaluate.
interface ResourceInput {
  name: string
  path: string
}

interface FileBuffer {
  name: string
  bufferString: string
  relativePath: string
}

const getFiles = (
  resources: ResourceInput[],
  files: FileBuffer[] = [],
  parent = ''
): FileBuffer[] => {
  for (const resource of resources) {
    const filePath = parent ? `${parent}/${resource.name}` : resource.name
    const stat = lstatSync(resource.path)
    if (stat.isFile()) {
      files.push({
        name: resource.name,
        bufferString: JSON.stringify(Array.from(readFileSync(resource.path))),
        relativePath: filePath
      })
    } else if (stat.isDirectory()) {
      const entries = readdirSync(resource.path)
      const subResources: ResourceInput[] = entries.map((entry) => ({
        path: `${resource.path}/${entry}`,
        name: entry
      }))
      getFiles(subResources, files, filePath)
    }
  }
  return files
}

export const dragDropFolder = async (
  page: Page,
  resources: ResourceInput[],
  targetSelector: string
) => {
  const files = getFiles(resources)

  await page.evaluate(
    ([files, selector]) => {
      const target = document.querySelector(selector as string)
      if (!target) throw new Error(`Target ${selector} not found`)

      const fileList = files as FileBuffer[]

      const blobOf = (f: FileBuffer) => new Blob([new Uint8Array(JSON.parse(f.bufferString))])

      // A real browser folder drop yields plain File objects through the
      // entries API and only attaches the path via FileSystemEntry.fullPath
      // (which getDroppedFiles copies to `relativePath`). So the files the
      // entries hand out must NOT also carry a webkitRelativePath, otherwise
      // the resource carries two slightly different path hints and the
      // vault-upload path encryption picks the wrong one. The flat `.files`
      // fallback list below keeps webkitRelativePath, since that fallback has
      // no other way to convey the tree.
      const cleanFile = (f: FileBuffer): File => new File([blobOf(f)], f.name)

      const dt = new DataTransfer()
      fileList.forEach((f) => {
        const fileObj = new File([blobOf(f)], f.name)
        if (f.relativePath.includes('/')) {
          Object.defineProperty(fileObj, 'webkitRelativePath', { value: f.relativePath })
        }
        dt.items.add(fileObj)
      })

      // A real folder drop does NOT expose its contents through `.files` - the
      // browser hands them over lazily through the entries API
      // (dataTransfer.items[].webkitGetAsEntry() -> a FileSystemEntry tree the
      // app walks to recurse into directories). To faithfully simulate a
      // folder drop we therefore build a synthetic entry tree and expose it on
      // `.items`. Doing this with plain objects on a plain `new Event('drop')`
      // keeps it working headless in every browser - a *real* DataTransfer
      // dispatched synthetically is read-only/empty in Firefox and WebKit.
      type Entry = Record<string, any>
      const fileEntry = (f: FileBuffer, fullPath: string): Entry => ({
        isFile: true,
        isDirectory: false,
        name: f.relativePath.split('/').filter(Boolean).pop(),
        fullPath,
        file: (resolve: (file: File) => void) => resolve(cleanFile(f))
      })
      const dirEntry = (name: string, fullPath: string, children: Entry[]): Entry => ({
        isFile: false,
        isDirectory: true,
        name,
        fullPath,
        createReader: () => {
          let drained = false
          return {
            // readEntries returns the batch once, then [] to signal the end.
            readEntries: (resolve: (entries: Entry[]) => void) => {
              resolve(drained ? [] : children)
              drained = true
            }
          }
        }
      })

      // Fold the flat list into a nested {name -> subtree | {__file}} tree.
      const tree: Record<string, any> = {}
      for (const f of fileList) {
        const segments = f.relativePath.split('/').filter(Boolean)
        let node = tree
        for (let i = 0; i < segments.length - 1; i++) {
          node[segments[i]] = node[segments[i]] || {}
          node = node[segments[i]]
        }
        node[segments[segments.length - 1]] = { __file: f }
      }
      const buildEntries = (node: Record<string, any>, parentPath: string): Entry[] =>
        Object.entries(node).map(([name, child]) =>
          child.__file
            ? fileEntry(child.__file, `${parentPath}/${name}`)
            : dirEntry(name, `${parentPath}/${name}`, buildEntries(child, `${parentPath}/${name}`))
        )
      const items = buildEntries(tree, '').map((entry) => ({
        kind: 'file',
        type: '',
        webkitGetAsEntry: () => entry,
        getAsFile: (): File | null => null
      }))

      const dropEvent = new Event('drop', { bubbles: true })
      Object.defineProperty(dropEvent, 'dataTransfer', {
        value: { files: dt.files, items, types: ['Files'] }
      })
      target.dispatchEvent(dropEvent)
    },
    [files, targetSelector]
  )
}
