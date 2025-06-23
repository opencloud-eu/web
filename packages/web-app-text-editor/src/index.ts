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
  useUserStore
} from '@opencloud-eu/web-pkg'
import { computed } from 'vue'
import { urlJoin } from '@opencloud-eu/web-client'

export default defineWebApplication({
  setup({ applicationConfig }) {
    const { $gettext } = useGettext()
    const userStore = useUserStore()
    const { openEmptyEditor } = useOpenEmptyEditor()

    const appId = 'text-editor'

    const fileExtensions = () => {
      const extensions: ApplicationFileExtension[] = [
        {
          extension: 'txt',
          mimeType: 'text/plain',
          label: () => $gettext('Plain text file')
        },
        { extension: 'html', mimeType: 'text/html' },
        { extension: 'css', mimeType: 'text/css' },
        { extension: 'js', mimeType: 'text/javascript' },
        { extension: 'xml', mimeType: 'text/xml' },
        { extension: 'csv', mimeType: 'text/csv' },
        {
          extension: 'md',
          mimeType: 'text/markdown',
          label: () => $gettext('Markdown file')
        },
        { extension: 'py', mimeType: 'text/x-python' },
        { extension: 'c', mimeType: 'text/x-c' },
        { extension: 'cpp', mimeType: 'text/x-c++' },
        { extension: 'java', mimeType: 'text/x-java-source' },
        { extension: 'sh', mimeType: 'text/x-shellscript' },
        { extension: 'asm', mimeType: 'text/x-asm' },
        { extension: 'scss', mimeType: 'text/x-scss' },
        { extension: 'yaml', mimeType: 'text/x-yaml' },
        { extension: 'json', mimeType: 'text/x-json' },
        { extension: 'log', mimeType: 'text/x-log' },
        { extension: 'ics', mimeType: 'text/calendar' },
        { extension: 'rtf', mimeType: 'text/richtext' },
        { extension: 'tsv', mimeType: 'text/tab-separated-values' },
        { extension: 'ts', mimeType: 'text/vnd.trolltech.linguist' },
        { extension: 'php', mimeType: 'application/x-httpd-php' }
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
          mimeType: extensionItem.mimeType,
          extension: extensionItem.extension,
          ...(Object.prototype.hasOwnProperty.call(extensionItem, 'newFileMenu') && {
            newFileMenu: extensionItem.newFileMenu
          })
        }
      })
    }

    const menuItems = computed<AppMenuItemExtension[]>(() => {
      const items: AppMenuItemExtension[] = []

      if (userStore.user) {
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
