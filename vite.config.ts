import {
  defineConfig,
  mergeConfig,
  Plugin,
  searchForWorkspaceRoot,
  UserConfig,
  ViteDevServer
} from 'vite'
import vue from '@vitejs/plugin-vue'
import { Target, viteStaticCopy } from 'vite-plugin-static-copy'
import { treatAsCommonjs } from 'vite-plugin-treat-umd-as-commonjs'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import tailwindcss from '@tailwindcss/vite'
import { basename, join } from 'path'
import { existsSync, readdirSync, readFileSync } from 'fs'

// build config
import packageJson from './package.json'
import { compilerOptions } from './vite.config.common'
import { getUserAgentRegex } from 'browserslist-useragent-regexp'
import browserslistToEsbuild from 'browserslist-to-esbuild'
import fetch from 'node-fetch'
import { Agent } from 'https'

const dist = process.env.DIST_DIR || 'dist'

const projectRootDir = searchForWorkspaceRoot(process.cwd())
const { version } = packageJson
const supportedBrowsersRegex = getUserAgentRegex({ allowHigherVersions: true })

// determine inputs
const input = readdirSync('packages').reduce(
  (acc, i) => {
    if (!i.startsWith('web-app')) {
      return acc
    }
    for (const extension of ['js', 'ts']) {
      const root = join('packages', i, 'src', `index.${extension}`)
      if (existsSync(root)) {
        acc[i as keyof typeof acc] = root
        break
      }
    }
    return acc
  },
  {
    'index.html': 'index.html',
    'oidc-silent-redirect.html': 'oidc-silent-redirect.html',
    'oidc-callback.html': 'oidc-callback.html'
  }
)

const getJson = async (url: string) => {
  return (
    await fetch(url, {
      ...(url.startsWith('https:') && {
        agent: new Agent({ rejectUnauthorized: false })
      })
    })
  ).json()
}

type ConfigJsonResponseBody = {
  options: Record<string, any>
  external_apps?: Array<{ id: string; path: string; config?: Record<string, unknown> }>
}

const getConfigJson = async (url: string) => {
  return (await getJson(url)) as ConfigJsonResponseBody
}

export const historyModePlugins = () =>
  [
    {
      name: 'base-href',
      transformIndexHtml: {
        handler() {
          return [
            {
              injectTo: 'head-prepend',
              tag: 'base',
              attrs: {
                href: '/'
              }
            }
          ]
        }
      }
    }
  ] as const

// Dev-only: in-memory registry of remote extension dev servers.
// Populated via /_dev/apps REST API, merged into /config.json responses.
const devRemotes = new Map<string, { id: string; path: string; config?: Record<string, unknown> }>()

export default defineConfig(({ mode, command }) => {
  const production = mode === 'production'

  /**
     When setting `OPENCLOUD_WEB_CONFIG_URL` make sure to configure the oauth/oidc client

     For OpenCloud instances you can use `./dev/docker/opencloud.idp.config.yaml`.
     In docker setups you need to mount it to `/etc/opencloud/idp.yaml`.
     E.g. with docker-compose you could add a volume to the OpenCloud container like this:
     - /home/youruser/projects/oc-web/dev/docker/opencloud.idp.config.yaml:/etc/opencloud/idp.yaml

     Example:
     OPENCLOUD_WEB_CONFIG_URL="https://your-open-cloud.test/config.json" pnpm vite

     */
  const configUrl =
    process.env.OPENCLOUD_WEB_CONFIG_URL || 'https://host.docker.internal:9200/config.json'

  const config: UserConfig = {
    ...(!production && {
      server: {
        port: 9201,
        ...(process.env.VITEST !== 'true' && {
          https: {
            key: readFileSync('./dev/docker/traefik/certificates/server.key'),
            cert: readFileSync('./dev/docker/traefik/certificates/server.crt')
          },
          proxy: {
            '/themes': {
              target: 'https://host.docker.internal:9200',
              changeOrigin: true,
              secure: false // allow self-signed certs
            }
          }
        })
      }
    })
  }

  return mergeConfig(
    {
      base: '',
      publicDir: 'packages/web-container',
      build: {
        cssCodeSplit: false,
        rolldownOptions: {
          preserveEntrySignatures: 'strict',
          input,
          output: {
            dir: dist,
            chunkFileNames: join('js', 'chunks', `[name]-[hash].mjs`),
            entryFileNames: join('js', '[name]-[hash].mjs'),
            codeSplitting: {
              groups: [
                {
                  name: 'design-system-components',
                  test: /tailwind|packages\/design-system\/src\/components/,
                  // tailwind needs to come first to ensure correct CSS layer cascade
                  priority: 10000
                }
              ]
            }
          }
        },
        target: browserslistToEsbuild()
      },
      server: {
        host: 'host.docker.internal',
        strictPort: true
      },
      css: {
        preprocessorOptions: {
          scss: {
            additionalData: `
                @use "sass:math";
                @use "sass:string";
                @use "sass:meta";
            `,
            silenceDeprecations: ['legacy-js-api', 'import']
          }
        }
      },
      define: {
        'process.env.PACKAGE_VERSION': JSON.stringify(version)
      },
      resolve: {
        dedupe: ['vue3-gettext'],
        alias: {
          crypto: join(projectRootDir, 'polyfills/crypto.js')
        }
      },
      plugins: [
        tailwindcss(),
        nodePolyfills({
          exclude: ['crypto']
        }),

        // Module Federation shared deps are registered at runtime in bootstrap.ts.
        // The @module-federation/vite plugin is only used on the remote (extension-sdk) side.

        // We need to "undefine" `define` which is set by requirejs loaded in index.html
        treatAsCommonjs(),

        vue({
          template: {
            compilerOptions
          }
        }),
        viteStaticCopy({
          targets: (() => {
            return [
              ...['icons', 'images'].map<Target>((name) => ({
                src: `packages/design-system/src/assets/${name}/*`,
                dest: `${name}`,
                rename: { stripBase: 5 }
              })),
              {
                src: `packages/design-system/src/assets/images/empty-states/*`,
                dest: 'images/empty-states',
                rename: { stripBase: 6 }
              },
              {
                src: 'node_modules/requirejs/require.js',
                dest: 'js',
                rename: { stripBase: 2 }
              }
            ]
          })()
        }),
        {
          name: '@opencloud-eu/vite-plugin-dev-remotes',
          apply: 'serve',
          configureServer(server: ViteDevServer) {
            // Health check: periodically verify registered remotes are still reachable
            const healthCheckInterval = setInterval(async () => {
              for (const [id, remote] of devRemotes) {
                try {
                  await fetch(remote.path, {
                    agent: new Agent({ rejectUnauthorized: false }),
                    signal: AbortSignal.timeout(3000)
                  })
                } catch {
                  devRemotes.delete(id)
                  console.log(`[dev-remotes] Health check failed, unregistered: ${id}`)
                  server.environments.client.hot.send({ type: 'full-reload', path: '*' })
                }
              }
            }, 10_000)
            server.httpServer?.on('close', () => clearInterval(healthCheckInterval))

            server.middlewares.use(async (request, response, next) => {
              // POST /_dev/apps — register a remote
              if (request.url === '/_dev/apps' && request.method === 'POST') {
                let body = ''
                request.on('data', (chunk: Buffer) => (body += chunk))
                request.on('end', () => {
                  try {
                    const { id, path, config } = JSON.parse(body)
                    if (!id || !path) {
                      response.statusCode = 400
                      response.end(JSON.stringify({ error: 'id and path required' }))
                      return
                    }
                    devRemotes.set(id, { id, path, ...(config && { config }) })
                    console.log(`[dev-remotes] Registered: ${id} -> ${path}`)
                    response.statusCode = 200
                    response.setHeader('Content-Type', 'application/json')
                    response.end(JSON.stringify({ ok: true }))
                    server.environments.client.hot.send({ type: 'full-reload', path: '*' })
                  } catch {
                    response.statusCode = 400
                    response.end(JSON.stringify({ error: 'invalid JSON' }))
                  }
                })
                return
              }

              // DELETE /_dev/apps/:id — unregister a remote
              const deleteMatch = request.url?.match(/^\/_dev\/apps\/(.+)$/)
              if (deleteMatch && request.method === 'DELETE') {
                const id = decodeURIComponent(deleteMatch[1])
                devRemotes.delete(id)
                console.log(`[dev-remotes] Unregistered: ${id}`)
                response.statusCode = 200
                response.setHeader('Content-Type', 'application/json')
                response.end(JSON.stringify({ ok: true }))
                server.environments.client.hot.send({ type: 'full-reload', path: '*' })
                return
              }

              // GET /_dev/apps — list registered remotes (for debugging)
              if (request.url === '/_dev/apps' && request.method === 'GET') {
                response.statusCode = 200
                response.setHeader('Content-Type', 'application/json')
                response.end(JSON.stringify(Array.from(devRemotes.values())))
                return
              }

              next()
            })
          }
        },
        {
          name: '@opencloud-eu/vite-plugin-runtime-config',
          configureServer(server: ViteDevServer) {
            server.middlewares.use(async (request, response, next) => {
              if (request.url === '/config.json') {
                try {
                  const configJson = await getConfigJson(configUrl)

                  // Merge dynamically registered dev remotes into external_apps
                  if (devRemotes.size > 0) {
                    const devApps = Array.from(devRemotes.values())
                    const devIds = new Set(devApps.map((a) => a.id))
                    configJson.external_apps = [
                      ...(configJson.external_apps || []).filter((a) => !devIds.has(a.id)),
                      ...devApps
                    ]
                  }

                  response.statusCode = 200
                  response.setHeader('Content-Type', 'application/json')
                  response.end(JSON.stringify(configJson))
                } catch (e) {
                  response.statusCode = 502
                  response.setHeader('Content-Type', 'application/json')
                  response.end(JSON.stringify(e))
                }
                return
              }
              next()
            })
          }
        },
        {
          name: 'html-transform',
          transformIndexHtml: {
            order: 'pre',
            handler(html, { filename }) {
              if (basename(filename) !== 'index.html') {
                return
              }

              return html
                .replace(/__TITLE__/g, process.env.TITLE || 'OpenCloud')
                .replace(/__COMPILATION_TIMESTAMP__/g, Date.now().toString())
                .replace(/__SUPPORTED_BROWSERS__/g, supportedBrowsersRegex.toString())
            }
          }
        },
        {
          name: 'import-map',
          transformIndexHtml: {
            handler(html, { bundle, filename }) {
              if (basename(filename) !== 'index.html') {
                return
              }

              // Build an import map for loading internal (as in: shipped and built within this mono repo) apps
              let moduleNames: string[]
              let buildModulePath: any
              if (bundle) {
                moduleNames = Object.keys(bundle)
                // We are in production mode here and need to provide paths relative to the module that contains the import, i.e. web-runtime-*.mjs
                // so it works when OpenCloud Web is hosted in a sub folder
                buildModulePath = (moduleName: string) => moduleName.replace('js/', './')
              } else {
                // We are in development mode here, so we can just use absolute module paths
                moduleNames = Object.keys(input)
                buildModulePath = (moduleName: string) => `/packages/${moduleName}/src/index`
              }

              const re = new RegExp(/(web-app-.*)/)
              const map = Object.fromEntries(
                moduleNames
                  .map((m) => {
                    const appName = re.exec(bundle?.[m]?.name || m)?.[1]
                    if (appName) {
                      return [appName, buildModulePath(m)]
                    }
                  })
                  .filter(Boolean)
              )
              return [
                {
                  tag: 'script',
                  children: `window.WEB_APPS_MAP = ${JSON.stringify(map)}`
                }
              ]
            }
          }
        },
        ...(command === 'serve' ? historyModePlugins() : [])
      ] as Plugin[]
    } as UserConfig,
    config
  )
})
