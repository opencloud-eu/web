import { AppWrapperRoute, defineWebApplication } from '@opencloud-eu/web-pkg'
import { useGettext } from 'vue3-gettext'
import App from './App.vue'
import translations from '../l10n/translations.json'

const applicationId = 'excalidraw'

export default defineWebApplication({
  setup() {
    const { $gettext } = useGettext()

    const routes = [
      {
        name: applicationId,
        path: '/:driveAliasAndItem(.*)?',
        component: AppWrapperRoute(App, { applicationId }),
        meta: {
          authContext: 'hybrid',
          title: $gettext('Excalidraw'),
          patchCleanPath: true
        }
      }
    ]

    const appInfo = {
      name: $gettext('Excalidraw'),
      id: applicationId,
      icon: 'pencil-ruler',
      defaultExtension: 'excalidraw',
      extensions: [
        {
          extension: 'excalidraw',
          routeName: applicationId,
          newFileMenu: {
            menuTitle: () => $gettext('Excalidraw whiteboard')
          }
        }
      ]
    }

    return {
      appInfo,
      routes,
      translations
    }
  }
})
