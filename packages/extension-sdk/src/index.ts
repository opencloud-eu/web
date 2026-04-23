import { mergeConfig, searchForWorkspaceRoot, ViteDevServer } from 'vite'
import { join, posix as posixPath } from 'path'
import { cwd } from 'process'
import { readFileSync, existsSync } from 'fs'
import type { IncomingMessage, ServerResponse } from 'http'
import tailwindcss from '@tailwindcss/vite'
import basicSsl from '@vitejs/plugin-basic-ssl'
import vue from '@vitejs/plugin-vue'
import { ViteUserConfig } from 'vitest/config'
import { federation } from '@module-federation/vite'
import { externalModules } from './externalModules'
import { federationRegistrationClient, manifestPlugin, manifestPath } from './plugins'
import { deepMerge } from './utils'

const distDir = process.env.OPENCLOUD_EXTENSION_DIST_DIR || 'dist'

const certsDir = process.env.OPENCLOUD_CERTS_DIR
const customHttps = certsDir
  ? {
      key: readFileSync(join(certsDir, 'server.key')),
      cert: readFileSync(join(certsDir, 'server.crt'))
    }
  : null

const appConfigPath = join('./src/', 'config.json')
const remoteEntryName = 'remoteEntry'
const remoteEntryExt = '.mjs'

export interface ExtensionConfigOverrides extends ViteUserConfig {
  /** Name of the extension, defaults to the package name */
  name?: string
  /** URL of the OpenCloud host web dev server, defaults to 'https://host.docker.internal:9201' */
  opencloudWebHostUrl?: string
}

export function defineConfig(overrides: ExtensionConfigOverrides = {}) {
  return ({ mode }: { mode: string }) => {
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
    function readAppConfig(): Record<string, unknown> | undefined {
      let config: Record<string, unknown> = {}
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
              entryFileNames: posixPath.join(
                'js',
                `[name]${isProduction ? '-[hash]' : ''}${remoteEntryExt}`
              ),
              chunkFileNames: posixPath.join('js', `[name]-[hash]${remoteEntryExt}`)
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
            configureServer(server: ViteDevServer) {
              server.middlewares.use(
                (req: IncomingMessage, _res: ServerResponse, next: () => void) => {
                  // Vite skips its transform middleware for requests with sec-fetch-dest: document,
                  // which breaks direct browser navigation to JS files like remoteEntry.js.
                  if (
                    (req.url?.endsWith('.js') || req.url?.endsWith('.mjs')) &&
                    req.headers['sec-fetch-dest'] === 'document'
                  ) {
                    req.headers['sec-fetch-dest'] = 'script'
                  }
                  next()
                }
              )
            }
          },
          ...(!isTesting
            ? [
                federation({
                  name,
                  exposes: { '.': './src/index.ts' },
                  filename: `${remoteEntryName}${isProduction ? '-[hash]' : ''}${remoteEntryExt}`,
                  shared: Object.fromEntries(
                    externalModules.map((pkg) => [pkg, { singleton: true, import: false }])
                  ),
                  manifest: false,
                  dts: false
                })
              ]
            : []),
          tailwindcss(),
          manifestPlugin(remoteEntryName),
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
      } satisfies ViteUserConfig,
      overrides
    )
  }
}
