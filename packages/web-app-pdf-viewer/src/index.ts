import translations from '../l10n/translations.json'
import { AppWrapperRoute, $gettext } from '@opencloud-eu/web-pkg'
import PdfViewer from './App.vue'

const routes = [
  {
    path: '/:driveAliasAndItem(.*)?',
    component: AppWrapperRoute(PdfViewer, {
      applicationId: 'pdf-viewer',
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

const appInfo = {
  name: $gettext('PDF Viewer'),
  id: 'pdf-viewer',
  icon: 'resource-type-pdf',
  iconFillType: 'fill',
  iconColor: 'var(--oc-color-icon-pdf)',
  extensions: [
    {
      extension: 'pdf',
      routeName: 'pdf-viewer'
    }
  ]
}

export default {
  appInfo,
  routes,
  translations
}
