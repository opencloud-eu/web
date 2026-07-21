import { useGettext } from 'vue3-gettext'
import translations from '../l10n/translations.json'
import TextEditor from './App.vue'
import {
  ApplicationFileExtension,
  ApplicationInformation,
  AppMenuItemExtension,
  AppWrapperRoute,
  defineWebApplication,
  useOpenEmptyEditor,
  useSpacesStore,
  useUserStore
} from '@opencloud-eu/web-pkg'
import { computed } from 'vue'
import { urlJoin } from '@opencloud-eu/web-client'

export default defineWebApplication({
  setup({ applicationConfig }) {
    const { $gettext } = useGettext()
    const userStore = useUserStore()
    const { openEmptyEditor } = useOpenEmptyEditor()
    const spacesStore = useSpacesStore()

    const appId = 'text-editor'

    const fileExtensions = () => {
      const extensions: ApplicationFileExtension[] = [
        { extension: 'txt', label: () => $gettext('Plain text file') },
        { extension: 'md', label: () => $gettext('Markdown file') },
        { extension: 'markdown', label: () => $gettext('Markdown file') },
        { extension: 'js', label: () => $gettext('JavaScript file') },
        { extension: 'jsx', label: () => $gettext('JSX file') },
        { extension: 'ts', label: () => $gettext('TypeScript file') },
        { extension: 'tsx', label: () => $gettext('TSX (TypeScript + JSX) file') },
        { extension: 'vue', label: () => $gettext('Vue component file') },
        { extension: 'json', label: () => $gettext('JSON file') },
        { extension: 'xml', label: () => $gettext('XML file') },
        { extension: 'yml', label: () => $gettext('YAML file') },
        { extension: 'yaml', label: () => $gettext('YAML file') },
        { extension: 'toml', label: () => $gettext('TOML config file') },
        { extension: 'ini', label: () => $gettext('INI config file') },
        { extension: 'conf', label: () => $gettext('Configuration file') },
        { extension: 'env', label: () => $gettext('Environment variables file') },
        { extension: 'py', label: () => $gettext('Python file') },
        { extension: 'php', label: () => $gettext('PHP file') },
        { extension: 'html', label: () => $gettext('HTML file') },
        { extension: 'css', label: () => $gettext('CSS file') },
        { extension: 'scss', label: () => $gettext('SCSS file') },
        { extension: 'sass', label: () => $gettext('Sass file') },
        { extension: 'less', label: () => $gettext('LESS CSS file') },
        { extension: 'csv', label: () => $gettext('CSV file') },
        { extension: 'tsv', label: () => $gettext('Tab-separated values file') },
        { extension: 'c', label: () => $gettext('C source file') },
        { extension: 'cpp', label: () => $gettext('C++ source file') },
        { extension: 'java', label: () => $gettext('Java source file') },
        { extension: 'sh', label: () => $gettext('Shell script') },
        { extension: 'bat', label: () => $gettext('Batch script') },
        { extension: 'asm', label: () => $gettext('Assembler source file') },
        { extension: 'log', label: () => $gettext('Log file') },
        { extension: 'ics', label: () => $gettext('Calendar file') },
        { extension: 'rtf', label: () => $gettext('Rich Text Format file') },
        { extension: 'dockerfile', label: () => $gettext('Dockerfile') },
        { extension: 'makefile', label: () => $gettext('Makefile') },
        { extension: 'sql', label: () => $gettext('SQL script file') },
        { extension: 'rs', label: () => $gettext('Rust source file') },
        { extension: 'go', label: () => $gettext('Go source file') },
        { extension: 'kt', label: () => $gettext('Kotlin source file') },
        { extension: 'swift', label: () => $gettext('Swift source file') },
        { extension: 'rb', label: () => $gettext('Ruby source file') },
        { extension: 'pl', label: () => $gettext('Perl script') },
        { extension: 'lua', label: () => $gettext('Lua script') },
        { extension: 'r', label: () => $gettext('R script') },
        { extension: 'm', label: () => $gettext('Objective-C or MATLAB file') },
        { extension: 'scala', label: () => $gettext('Scala source file') },
        { extension: 'cs', label: () => $gettext('C# source file') },
        { extension: 'fs', label: () => $gettext('F# source file') },
        { extension: 'clj', label: () => $gettext('Clojure source file') },
        { extension: 'hs', label: () => $gettext('Haskell source file') },
        { extension: 'erl', label: () => $gettext('Erlang source file') },
        { extension: 'ex', label: () => $gettext('Elixir source file') },
        { extension: 'zig', label: () => $gettext('Zig source file') },
        { extension: 'nim', label: () => $gettext('Nim source file') },
        { extension: 'odin', label: () => $gettext('Odin source file') },
        { extension: 'ml', label: () => $gettext('OCaml source file') },
        { extension: 'v', label: () => $gettext('V language source file') },
        { extension: 'dart', label: () => $gettext('Dart source file') },

        { extension: 'gitignore', label: () => $gettext('Git ignore file') },
        { extension: 'gitattributes', label: () => $gettext('Git attributes file') },
        { extension: 'editorconfig', label: () => $gettext('EditorConfig file') },
        { extension: 'properties', label: () => $gettext('Java properties file') },
        { extension: 'cfg', label: () => $gettext('Configuration file') },
        { extension: 'service', label: () => $gettext('systemd service file') },
        { extension: 'desktop', label: () => $gettext('Desktop entry file') },
        { extension: 'npmrc', label: () => $gettext('npm configuration file') },
        { extension: 'lock', label: () => $gettext('Lock file') },
        { extension: 'gradle', label: () => $gettext('Gradle build script') },

        { extension: 'tex', label: () => $gettext('LaTeX file') },
        { extension: 'adoc', label: () => $gettext('AsciiDoc file') },
        { extension: 'rst', label: () => $gettext('reStructuredText file') },
        { extension: 'org', label: () => $gettext('Org mode file') },
        { extension: 'wiki', label: () => $gettext('Wiki markup file') },

        { extension: 'ndjson', label: () => $gettext('Newline-delimited JSON file') },
        { extension: 'jsonl', label: () => $gettext('JSON Lines file') },
        { extension: 'geojson', label: () => $gettext('GeoJSON file') },
        { extension: 'graphql', label: () => $gettext('GraphQL schema or query file') },
        { extension: 'proto', label: () => $gettext('Protocol Buffers schema file') },

        { extension: 'tf', label: () => $gettext('Terraform file') },
        { extension: 'hcl', label: () => $gettext('HashiCorp configuration file') },
        { extension: 'nomad', label: () => $gettext('Nomad job file') },

        { extension: 'cmake', label: () => $gettext('CMake script') },
        { extension: 'mk', label: () => $gettext('Make include file') },
        { extension: 'gradle.kts', label: () => $gettext('Kotlin Gradle build script') },
        { extension: 'bazel', label: () => $gettext('Bazel build file') },

        { extension: 'zsh', label: () => $gettext('Z shell script') },
        { extension: 'fish', label: () => $gettext('Fish shell script') },
        { extension: 'ps1', label: () => $gettext('PowerShell script') },

        { extension: 'info', label: () => $gettext('GNU info documentation file') },
        { extension: 'man', label: () => $gettext('Manual page file') },
        { extension: 'text', label: () => $gettext('Plain text file') },

        { extension: 'htm', label: () => $gettext('HTML file') },
        { extension: 'mjs', label: () => $gettext('JavaScript module file') },
        { extension: 'cjs', label: () => $gettext('CommonJS module file') },

        { extension: 'h', label: () => $gettext('C/C++ header file') },
        { extension: 'hpp', label: () => $gettext('C++ header file') },
        { extension: 'cc', label: () => $gettext('C++ source file') },
        { extension: 'cxx', label: () => $gettext('C++ source file') },
        { extension: 'hh', label: () => $gettext('C++ header file') },
        { extension: 'hxx', label: () => $gettext('C++ header file') },

        { extension: 's', label: () => $gettext('Assembler source file') },
        { extension: 'S', label: () => $gettext('Preprocessed assembler source file') },

        { extension: 'd', label: () => $gettext('D source file') },
        { extension: 'jl', label: () => $gettext('Julia source file') },
        { extension: 'groovy', label: () => $gettext('Groovy source file') },
        { extension: 'tcl', label: () => $gettext('Tcl script') },
        { extension: 'vb', label: () => $gettext('Visual Basic source file') },

        { extension: 'cnf', label: () => $gettext('Configuration file') },
        { extension: 'config', label: () => $gettext('Configuration file') },

        { extension: 'pem', label: () => $gettext('PEM certificate or key file') },
        { extension: 'crt', label: () => $gettext('Certificate file') },
        { extension: 'key', label: () => $gettext('Private key file') },
        { extension: 'csr', label: () => $gettext('Certificate signing request file') },
        { extension: 'pub', label: () => $gettext('Public key file') },

        { extension: 'ldif', label: () => $gettext('LDAP data interchange file') },

        { extension: 'nfo', label: () => $gettext('Information file') },
        { extension: 'pod', label: () => $gettext('Perl POD documentation file') },

        { extension: 'kts', label: () => $gettext('Kotlin script file') },
        { extension: 'bzl', label: () => $gettext('Bazel Starlark file') },
        { extension: 'BUILD', label: () => $gettext('Bazel build file') },
        { extension: 'WORKSPACE', label: () => $gettext('Bazel workspace file') },

        { extension: 'tfvars', label: () => $gettext('Terraform variables file') },

        { extension: 'bash', label: () => $gettext('Bash script') },
        { extension: 'ksh', label: () => $gettext('Korn shell script') }
      ]

      const config = applicationConfig || {}
      extensions.push(...(config.extraExtensions || []).map((ext: string) => ({ extension: ext })))

      let primaryExtensions: string[] = config.primaryExtensions || ['txt', 'md']

      if (typeof primaryExtensions === 'string') {
        primaryExtensions = [primaryExtensions]
      }

      return extensions.reduce<ApplicationFileExtension[]>((acc, extensionItem) => {
        const isPrimary = primaryExtensions.includes(extensionItem.extension)
        if (isPrimary) {
          extensionItem.newFileMenu = {
            menuTitle() {
              if (typeof extensionItem.label === 'function') {
                return extensionItem.label()
              }
              return extensionItem.label
            }
          }
        }
        acc.push(extensionItem)
        return acc
      }, [])
    }

    const routes = [
      {
        path: '/:driveAliasAndItem(.*)?',
        component: AppWrapperRoute(TextEditor, {
          applicationId: appId
        }),
        name: 'text-editor',
        meta: {
          authContext: 'hybrid',
          title: $gettext('Text Editor'),
          patchCleanPath: true
        }
      }
    ]

    const appInfo: ApplicationInformation = {
      name: $gettext('Text Editor'),
      id: appId,
      icon: 'file-text',
      color: '#0D856F',
      defaultExtension: 'txt',
      meta: {
        fileSizeLimit: 50000000
      },
      extensions: fileExtensions().map((extensionItem) => {
        return {
          extension: extensionItem.extension,
          ...(Object.prototype.hasOwnProperty.call(extensionItem, 'newFileMenu') && {
            newFileMenu: extensionItem.newFileMenu
          })
        }
      })
    }

    const menuItems = computed<AppMenuItemExtension[]>(() => {
      const items: AppMenuItemExtension[] = []
      if (userStore.user && spacesStore.personalSpace) {
        items.push({
          id: `app.${appInfo.id}.menuItem`,
          type: 'appMenuItem',
          label: () => appInfo.name,
          color: appInfo.color,
          icon: appInfo.icon,
          priority: 20,
          path: urlJoin(appInfo.id),
          handler: () => openEmptyEditor(appInfo.id, appInfo.defaultExtension)
        })
      }

      return items
    })

    return {
      appInfo,
      routes,
      translations,
      extensions: menuItems
    }
  }
})
