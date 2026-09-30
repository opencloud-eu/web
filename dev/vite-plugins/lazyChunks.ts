// Vite plugin: fails the build if one of the given chunks is statically
// reachable from an entry, i.e. would be loaded on first paint. This notifies
// us when a chunk that should be lazy-loaded is incorrectly included in the
// initial bundle.

import type { Plugin } from 'vite'

export function lazyChunks(names: string[]): Plugin {
  return {
    name: 'lazy-chunks',
    apply: 'build',
    generateBundle(_options, bundle) {
      const chunks = Object.values(bundle).filter((output) => output.type === 'chunk')
      const byFileName = new Map(chunks.map((chunk) => [chunk.fileName, chunk]))

      // BFS over static imports, remembering the importer to print the path
      const importer = new Map<string, string | null>()
      const queue = chunks.filter((chunk) => chunk.isEntry).map((chunk) => chunk.fileName)
      queue.forEach((fileName) => importer.set(fileName, null))

      while (queue.length) {
        const fileName = queue.shift()
        const chunk = byFileName.get(fileName)

        if (names.includes(chunk.name)) {
          const path = [fileName]
          while (importer.get(path[0])) {
            path.unshift(importer.get(path[0]))
          }
          this.error(
            `"${chunk.name}" must be loaded lazily but is statically imported via:\n  ${path.join('\n  -> ')}`
          )
        }

        for (const imported of chunk.imports) {
          if (!importer.has(imported) && byFileName.has(imported)) {
            importer.set(imported, fileName)
            queue.push(imported)
          }
        }
      }
    }
  }
}
