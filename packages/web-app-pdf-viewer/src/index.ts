import { computed } from 'vue'
import { useGettext } from 'vue3-gettext'
import translations from '../l10n/translations.json'
import {
  defineWebApplication,
  resourceEditorRoute,
  type ResourceEditorExtension
} from '@opencloud-eu/web-pkg'
import PdfViewer from './App.vue'

export default defineWebApplication({
  setup() {
    const { $gettext } = useGettext()
    const appId = 'pdf-viewer'

    const extension: ResourceEditorExtension = {
      id: 'app.pdf-viewer',
      type: 'resourceEditor',
      appId,
      extensions: ['pdf'],
      mimeTypes: ['application/pdf'],
      component: PdfViewer,
      urlForResourceOptions: { disposition: 'inline' }
    }

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
            routeName: appId
          }
        ]
      },
      routes: [resourceEditorRoute({ extension, meta: { title: $gettext('PDF Viewer') } })],
      extensions: computed(() => [extension]),
      translations
    }
  }
})
