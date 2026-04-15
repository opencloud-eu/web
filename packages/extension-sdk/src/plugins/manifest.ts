import type { Plugin } from 'vite'
import { join } from 'path'
import { readFileSync, existsSync } from 'fs'

const manifestFile = 'manifest.json'
export const manifestPath = join('./src/', manifestFile)

/**
 * Generates manifest.json for OpenCloud app discovery.
 */
export function manifestPlugin(remoteEntryName: string): Plugin {
  let outputDir = ''

  return {
    name: 'manifest',
    apply: 'build',
    configResolved(config) {
      outputDir = config.build.outDir
    },
    buildStart() {
      this.addWatchFile(manifestPath)
    },
    generateBundle(_options, bundle) {
      const generatedManifestPath = join(outputDir, manifestFile)
      if (existsSync(generatedManifestPath)) {
        this.warn(
          `${generatedManifestPath} already exists in output directory (likely from public/), skipping generation\n` +
            `Consider using --emptyOutDir if outDir is outside of project root.`
        )
        return
      }

      // Find the remote entry chunk (emitted by the federation plugin)
      const entryChunk = Object.values(bundle).find(
        (chunk) => chunk.type === 'chunk' && chunk.name === remoteEntryName
      )

      if (!entryChunk) {
        this.error('No entry chunk found')
      }

      let manifest: Record<string, unknown> = {}
      if (existsSync(manifestPath)) {
        try {
          manifest = JSON.parse(readFileSync(manifestPath).toString())
        } catch (err) {
          this.error(
            `Failed to parse manifest.json at ${manifestPath}: ${(err as Error).message}\n` +
              `Please ensure manifest.json contains a valid JSON object.`
          )
        }
      }

      // set entryPoint
      manifest.entrypoint = entryChunk!.fileName

      // Add manifest.json to the bundle
      this.emitFile({
        type: 'asset',
        fileName: manifestFile,
        source: JSON.stringify(manifest, null, 2)
      })
    }
  } satisfies Plugin
}
