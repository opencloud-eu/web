import { useGettext } from 'vue3-gettext'
import translations from '../l10n/translations.json'
import { AppWrapperRoute, defineWebApplication } from '@opencloud-eu/web-pkg'
import PdfViewer from './App.vue'

export default defineWebApplication({
  setup() {
    const { $gettext } = useGettext()

    const appId = 'pdf-viewer'

    const routes = [
      {
        path: '/:driveAliasAndItem(.*)?',
        component: AppWrapperRoute(PdfViewer, {
          applicationId: appId,
          urlForResourceOptions: {
            disposition: 'inline'
          }
        }),
        name: 'pdf-viewer',
        meta: {
          authContext: 'hybrid',
          title: $gettext('PDF Viewer'),
          patchCleanPath: true
        }
      }
    ]

    return {
      appInfo: {
        name: $gettext('PDF Viewer'),
        id: appId,
        icon: 'resource-type-pdf',
        iconFillType: 'fill',
        iconColor: 'var(--oc-color-icon-pdf)',
        extensions: [
          {
            extension: 'pdf',
            routeName: 'pdf-viewer'
          }
        ]
      },
      routes,
      translations
    }
  }
})
