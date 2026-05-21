import { AppWrapperRoute, defineWebApplication } from '@opencloud-eu/web-pkg'
import { useGettext } from 'vue3-gettext'
import App from './App.vue'
import translations from '../l10n/translations.json'

const applicationId = 'tiptap'

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
          title: $gettext('Tiptap'),
          patchCleanPath: true
        }
      }
    ]

    const appInfo = {
      name: $gettext('Tiptap'),
      id: applicationId,
      icon: 'file-paper',
      defaultExtension: 'md',
      extensions: [
        {
          extension: 'md',
          routeName: applicationId
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
