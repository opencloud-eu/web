// ATTENTION: this is a .mjs (instead of a .ts) file on purpose,
// because we don't want to transpile it before publishing
// c.f. https://github.com/vitejs/vite/issues/5370

import { mergeConfig, searchForWorkspaceRoot } from 'vite'
import { join } from 'path'
import { cwd } from 'process'
import { readFileSync, existsSync } from 'fs'
import tailwindcss from '@tailwindcss/vite'
import basicSsl from '@vitejs/plugin-basic-ssl'
import vue from '@vitejs/plugin-vue'
import { federation } from '@module-federation/vite'
import { externalModules } from './externalModules.mjs'
import { federationRegistrationClient } from './federationRegistrationClient.mjs'

const distDir = process.env.OPENCLOUD_EXTENSION_DIST_DIR || 'dist'

const certsDir = process.env.OPENCLOUD_CERTS_DIR
const customHttps = certsDir
  ? {
      key: readFileSync(join(certsDir, 'server.key')),
      cert: readFileSync(join(certsDir, 'server.crt'))
    }
  : null

// Deep merge objects, replace arrays (matches mergo.WithOverride behavior on the Go side).
function deepMerge(target, source) {
  const result = { ...target }
  for (const key of Object.keys(source)) {
    const tv = target[key]
    const sv = source[key]
    if (
      sv &&
      typeof sv === 'object' &&
      !Array.isArray(sv) &&
      tv &&
      typeof tv === 'object' &&
      !Array.isArray(tv)
    ) {
      result[key] = deepMerge(tv, sv)
    } else {
      result[key] = sv
    }
  }
  return result
}

const manifestFile = 'manifest.json'
const manifestPath = join('./src/', manifestFile)
const appConfigPath = join('./src/', 'config.json')
const remoteEntryName = 'remoteEntry'
const remoteEntryExt = '.mjs'

// Generates manifest.json for OpenCloud app discovery.
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

      // Find the remote entry chunk (emitted by the federation plugin)
      const entryChunk = Object.values(bundle).find(
        (chunk) => chunk.type === 'chunk' && chunk.name === remoteEntryName
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
        fileName: manifestFile,
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
    const { port = 9210 } = overrides?.server || {}
    const hostUrl =
      overrides?.opencloudWebHostUrl ||
      process.env.OPENCLOUD_WEB_HOST_URL ||
      'https://host.docker.internal:9201'

    // Read merged metadata: manifest.json defaults + config.json overrides
    function readAppConfig() {
      let config = {}
      if (existsSync(manifestPath)) {
        try {
          const manifest = JSON.parse(readFileSync(manifestPath).toString())
          if (manifest.config) {
            config = manifest.config
          }
        } catch {
          // ignore malformed manifest
        }
      }
      if (existsSync(appConfigPath)) {
        try {
          const overrides = JSON.parse(readFileSync(appConfigPath).toString())
          config = deepMerge(config, overrides)
        } catch {
          // ignore malformed config
        }
      }
      return Object.keys(config).length > 0 ? config : undefined
    }

    return mergeConfig(
      {
        base: './', // make asset paths relative so imports work from wherever the extension is loaded
        build: {
          cssCodeSplit: true,
          minify: isProduction,
          outDir: distDir,
          rollupOptions: {
            input: {
              [name]: './src/index.ts'
            },
            output: {
              entryFileNames: join('js', `[name]${isProduction ? '-[hash]' : ''}${remoteEntryExt}`),
              chunkFileNames: join('js', `[name]-[hash]${remoteEntryExt}`)
            }
          }
        },
        plugins: [
          vue({
            customElement: false,
            ...(isTesting && { template: { compilerOptions: { whitespace: 'preserve' } } })
          }),
          ...(customHttps ? [] : [basicSsl({ name: 'opencloud' })]),
          {
            name: 'fix-sec-fetch-dest',
            configureServer(server) {
              server.middlewares.use((req, res, next) => {
                // Vite skips its transform middleware for requests with sec-fetch-dest: document,
                // which breaks direct browser navigation to JS files like remoteEntry.js.
                if (
                  (req.url?.endsWith('.js') || req.url?.endsWith('.mjs')) &&
                  req.headers['sec-fetch-dest'] === 'document'
                ) {
                  req.headers['sec-fetch-dest'] = 'script'
                }
                next()
              })
            }
          },
          federation({
            name,
            exposes: { '.': './src/index.ts' },
            filename: `${remoteEntryName}${isProduction ? '-[hash]' : ''}${remoteEntryExt}`,
            shared: Object.fromEntries(
              externalModules.map((pkg) => [pkg, { singleton: true, import: false }])
            ),
            manifest: false,
            dts: false
          }),
          tailwindcss(),
          manifestPlugin(),
          federationRegistrationClient({
            hostUrl,
            name,
            entryPoint: `${remoteEntryName}${remoteEntryExt}`,
            getMetadata: readAppConfig,
            metadataWatchFiles: [manifestPath, appConfigPath]
          })
        ],
        server: {
          origin: `https://host.docker.internal:${port}`,
          host: 'host.docker.internal',
          port,
          cors: true,
          ...(customHttps && { https: customHttps })
        },
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
            '**/e2e/**'
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
