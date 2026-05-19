import { AppWrapperRoute, defineWebApplication } from '@opencloud-eu/web-pkg'
import { useGettext } from 'vue3-gettext'
import App from './App.vue'
import translations from '../l10n/translations.json'

const applicationId = 'codemirror'

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
          title: $gettext('CodeMirror'),
          patchCleanPath: true
        }
      }
    ]

    const appInfo = {
      name: $gettext('CodeMirror'),
      id: applicationId,
      icon: 'file-text',
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
