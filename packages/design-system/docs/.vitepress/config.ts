import { defineConfig } from 'vitepress'
import { searchForWorkspaceRoot } from 'vite'
import { viteStaticCopy } from 'vite-plugin-static-copy'
import Container from 'markdown-it-container'
import path from 'path'
import { generateJsonMetaData } from './generateJsonMetaData'
import { generateCSSVarsJson } from './generateCSSVarsJson'
import tailwindcss from '@tailwindcss/vite'

const projectRootDir = searchForWorkspaceRoot(process.cwd())

export default defineConfig({
  title: 'OpenCloud Design System',
  description: 'Design System for OpenCloud',
  base: '/design-system/',
  appearance: false,
  head: [['link', { rel: 'icon', href: '/logo.svg' }]],
  vite: {
    resolve: {
      alias: {
        // necessary to allow compiling our live code blocks
        'vue/server-renderer': path.resolve(
          projectRootDir,
          'node_modules/vue/server-renderer/index.js'
        ),
        vue: path.resolve(projectRootDir, 'node_modules/vue/dist/vue.esm-bundler.js')
      }
    },
    css: {
      postcss: {
        plugins: [
          {
            postcssPlugin: 'remove-base-css',
            Once(root, { result }) {
              if (result.opts.from?.endsWith('theme-default/styles/base.css')) {
                // remove the default VitePress base css because it would overwrite all Tailwind layers
                root.removeAll()
              }
            }
          }
        ]
      },
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
    plugins: [
      tailwindcss(),
      generateJsonMetaData(),
      generateCSSVarsJson(),
      viteStaticCopy({
        targets: (() => {
          return [
            {
              src: `${projectRootDir}/packages/design-system/src/assets/icons/*`,
              dest: `./components/icons`
            }
          ]
        })()
      }) as any // FIXME: remove type cast once vitepress uses vite 6
    ]
  },
  themeConfig: {
    logo: '/logo.svg',
    search: {
      provider: 'local'
    },
    sidebar: {
      '/': [
        {
          text: 'Getting Started',
          items: [
            {
              text: 'Installation',
              link: '/gettingStarted/installation'
            },
            {
              text: 'Usage',
              link: '/gettingStarted/usage'
            },
            {
              text: 'Tailwind migration (v4)',
              link: '/gettingStarted/tailwindMigration'
            }
          ]
        },
        {
          text: 'Design Tokens',
          items: [
            {
              text: 'Color roles',
              link: '/designTokens/colorRoles'
            },
            {
              text: 'Color palette',
              link: '/designTokens/colorPalette'
            }
          ]
        },
        {
          text: 'Components',
          base: '/components/',
          items: [
            {
              text: 'OcApplicationIcon',
              link: '/OcApplicationIcon'
            },
            {
              text: 'OcAvatar',
              link: '/OcAvatar'
            },
            {
              text: 'OcAvatarCount',
              link: '/OcAvatarCount'
            },
            {
              text: 'OcAvatarItem',
              link: '/OcAvatarItem'
            },
            {
              text: 'OcAvatars',
              link: '/OcAvatars'
            },
            {
              text: 'OcBottomDrawer',
              link: '/OcBottomDrawer'
            },
            {
              text: 'OcBreadcrumb',
              link: '/OcBreadcrumb'
            },
            {
              text: 'OcButton',
              link: '/OcButton'
            },
            {
              text: 'OcCheckbox',
              link: '/OcCheckbox'
            },
            {
              text: 'OcColorInput',
              link: '/OcColorInput'
            },
            {
              text: 'OcContextualHelper',
              link: '/OcContextualHelper'
            },
            {
              text: 'OcDatepicker',
              link: '/OcDatepicker'
            },
            {
              text: 'OcDefinitionList',
              link: '/OcDefinitionList'
            },
            {
              text: 'OcDrop',
              link: '/OcDrop'
            },
            {
              text: 'OcDropzone',
              link: '/OcDropzone'
            },
            {
              text: 'OcEmojiPicker',
              link: '/OcEmojiPicker'
            },
            {
              text: 'OcErrorLog',
              link: '/OcErrorLog'
            },
            {
              text: 'OcFileInput',
              link: '/OcFileInput'
            },
            {
              text: 'OcFilterChip',
              link: '/OcFilterChip'
            },
            {
              text: 'OcHiddenAnnouncer',
              link: '/OcHiddenAnnouncer'
            },
            {
              text: 'OcIcon',
              link: '/OcIcon'
            },
            {
              text: 'OcImage',
              link: '/OcImage'
            },
            {
              text: 'OcInfoDrop',
              link: '/OcInfoDrop'
            },
            {
              text: 'OcList',
              link: '/OcList'
            },
            {
              text: 'OcLoader',
              link: '/OcLoader'
            },
            {
              text: 'OcModal',
              link: '/OcModal'
            },
            {
              text: 'OcNotificationMessage',
              link: '/OcNotificationMessage'
            },
            {
              text: 'OcNotifications',
              link: '/OcNotifications'
            },
            {
              text: 'OcPageSize',
              link: '/OcPageSize'
            },
            {
              text: 'OcPagination',
              link: '/OcPagination'
            },
            {
              text: 'OcProgress',
              link: '/OcProgress'
            },
            {
              text: 'OcProgressPie',
              link: '/OcProgressPie'
            },
            {
              text: 'OcRadio',
              link: '/OcRadio'
            },
            {
              text: 'OcRecipient',
              link: '/OcRecipient'
            },
            {
              text: 'OcSearchBar',
              link: '/OcSearchBar'
            },
            {
              text: 'OcSelect',
              link: '/OcSelect'
            },
            {
              text: 'OcSpinner',
              link: '/OcSpinner'
            },
            {
              text: 'OcStatusIndicators',
              link: '/OcStatusIndicators'
            },
            {
              text: 'OcSwitch',
              link: '/OcSwitch'
            },
            {
              text: 'OcTable',
              link: '/OcTable'
            },
            {
              text: 'OcTableSimple',
              link: '/OcTableSimple'
            },
            {
              text: 'OcTag',
              link: '/OcTag'
            },
            {
              text: 'OcTextarea',
              link: '/OcTextarea'
            },
            {
              text: 'OcTextInput',
              link: '/OcTextInput'
            }
          ]
        }
      ]
    },
    socialLinks: [
      {
        icon: 'github',
        link: 'https://github.com/opencloud-eu/web/tree/main/packages/design-system'
      },
      {
        icon: 'matrix',
        link: 'https://app.element.io/#/room/#opencloud:matrix.org'
      }
    ]
  },
  markdown: {
    config: (md) => {
      md.use(Container, 'livecode', {
        render: (tokens: Array<Record<string, any>>, idx: number) => {
          if (tokens[idx].info.includes('livecode')) {
            const path = tokens[idx].attrs?.[0]?.[1]
            return `<live-code-block path="${path || ''}">`
          }
          return '</live-code-block>'
        }
      })
      md.use(Container, 'component-api', {
        render: (tokens: Array<Record<string, any>>, idx: number) => {
          if (tokens[idx].info.includes('component-api')) {
            return '<component-api />'
          }
          return ''
        }
      })
    }
  },
  rewrites: {
    'components/:name/:slug*': 'components/:slug*'
  }
})
