// ATTENTION: this is a .mjs (instead of a .ts) file on purpose,
// because we don't want to transpile it before publishing
// c.f. https://github.com/vitejs/vite/issues/5370

import { mergeConfig, searchForWorkspaceRoot } from 'vite'
import { join } from 'path'
import { cwd } from 'process'
import { readFileSync, existsSync } from 'fs'

import vue from '@vitejs/plugin-vue'

const distDir = process.env.OPENCLOUD_EXTENSION_DIST_DIR || 'dist'

const certsDir = process.env.OPENCLOUD_CERTS_DIR
const defaultHttps = () =>
  certsDir && {
    key: readFileSync(join(certsDir, 'server.key')),
    cert: readFileSync(join(certsDir, 'server.crt'))
  }

const manifestFile = 'manifest.json'
const manifestPath = join('./src/', manifestFile)
const manifestPlugin = () => {
  let outputDir

  return {
    name: 'manifest',
    apply: 'build',
    configResolved(config) {
      outputDir = config.build.outDir
    },
    buildStart() {
      this.addWatchFile(manifestPath)
    },
    generateBundle(options, bundle) {
      const generatedManifestPath = join(outputDir, manifestFile)
      if (existsSync(generatedManifestPath)) {
        this.warn(
          `${generatedManifestPath} already exists in output directory (likely from public/), skipping generation\n` +
            `Consider using --emptyOutDir if outDir is outside of project root.`
        )
        return
      }

      // Find the entry chunk
      const entryChunk = Object.values(bundle).find(
        (chunk) => chunk.type === 'chunk' && chunk.isEntry
      )

      if (!entryChunk) {
        this.error('No entry chunk found')
        return
      }

      let manifest = {}
      if (existsSync(manifestPath)) {
        try {
          manifest = JSON.parse(readFileSync(manifestPath).toString())
        } catch (err) {
          this.error(
            `Failed to parse manifest.json at ${manifestPath}: ${err.message}\n` +
              `Please ensure manifest.json contains a valid JSON object.`
          )
          return
        }
      }

      // set entryPoint
      manifest.entrypoint = entryChunk.fileName

      // Add manifest.json to the bundle
      this.emitFile({
        type: 'asset',
        fileName: 'manifest.json',
        source: JSON.stringify(manifest, null, 2)
      })
    }
  }
}

export const defineConfig = (overrides = {}) => {
  return ({ mode }) => {
    const isProduction = mode === 'production'
    const isTesting = mode === 'test'

    // read package name from vite workspace
    const packageJson = JSON.parse(
      readFileSync(join(searchForWorkspaceRoot(cwd()), 'package.json')).toString()
    )

    const name = overrides.name || packageJson.name

    // set default config
    const { https = defaultHttps(), port = 9210 } = overrides?.server || {}
    const isHttps = !!https

    return mergeConfig(
      {
        server: {
          port,
          strictPort: true,
          ...(isHttps && https)
        },
        build: {
          cssCodeSplit: true,
          minify: isProduction,
          outDir: distDir,
          rollupOptions: {
            // keep in sync with packages/web-runtime/src/container/application/index.ts
            external: [
              'vue',
              'luxon',
              'pinia',
              'vue3-gettext',

              '@opencloud-eu/web-client',
              '@opencloud-eu/web-client/graph',
              '@opencloud-eu/web-client/graph/generated',
              '@opencloud-eu/web-client/ocs',
              '@opencloud-eu/web-client/sse',
              '@opencloud-eu/web-client/webdav',
              '@opencloud-eu/web-pkg',
              'web-client',
              'web-pkg'
            ],
            preserveEntrySignatures: 'strict',
            input: {
              [name]: './src/index.ts'
            },
            output: {
              format: 'amd',
              chunkFileNames: join('js', 'chunks', '[name]-[hash].mjs'),
              entryFileNames: join('js', `[name]${isProduction ? '-[hash]' : ''}.js`)
            }
          }
        },
        plugins: [
          vue({
            // set to true when switching to esm
            customElement: false,
            ...(isTesting && { template: { compilerOptions: { whitespace: 'preserve' } } })
          }),
          manifestPlugin()
        ],
        test: {
          globals: true,
          environment: 'happy-dom',
          clearMocks: true,
          include: ['**/*.spec.ts'],
          exclude: [
            '**/node_modules/**',
            '**/dist/**',
            '**/cypress/**',
            '**/.{idea,git,cache,output,temp}/**',
            '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*',
            '.pnpm-store/*',
            'e2e/**'
          ],
          coverage: {
            provider: 'v8',
            reportsDirectory: './coverage',
            reporter: 'lcov'
          }
        }
      },
      overrides
    )
  }
}
