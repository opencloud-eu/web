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
        { extension: 'makefile', label: () => $gettext('Makefile') }
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
        fileSizeLimit: 2000000
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
