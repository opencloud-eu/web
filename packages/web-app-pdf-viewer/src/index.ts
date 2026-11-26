import { computed, markRaw, unref } from 'vue'
import { useGettext } from 'vue3-gettext'
import type { Resource, SpaceResource } from '@opencloud-eu/web-client'
import {
  AppWrapperRoute,
  defineWebApplication,
  type ApplicationInformation,
  type SidebarPanelExtension
} from '@opencloud-eu/web-pkg'
import App from './App.vue'
import PdfDocumentProperties from './components/PdfDocumentProperties.vue'
import {
  documentPropertiesPanelName,
  useDocumentPropertiesPanelState
} from './composables/useDocumentPropertiesPanelState'
import translations from 'virtual:l10n/web-app-pdf-viewer'

export const applicationId = 'pdf-viewer'

export default defineWebApplication({
  setup() {
    const { $gettext } = useGettext()

    const routes = [
      {
        name: applicationId,
        path: '/:driveAliasAndItem(.*)?',
        component: AppWrapperRoute(App, {
          applicationId,
          fileContentOptions: { responseType: 'arraybuffer' },
          // Forms are often only filled in to print them, an autosave would change the file.
          disableAutoSave: true
        }),
        meta: {
          authContext: 'hybrid',
          title: $gettext('PDF Viewer'),
          patchCleanPath: true
        }
      }
    ]

    const appInfo: ApplicationInformation = {
      name: $gettext('PDF Viewer'),
      id: applicationId,
      icon: 'resource-type-pdf',
      extensions: [
        {
          extension: 'pdf',
          mimeType: 'application/pdf',
          routeName: applicationId,
          icon: { name: 'resource-type-pdf', fillType: 'fill' }
        }
      ]
    }

    // In the right sidebar of the app, only for the open document.
    const { resourceId, properties } = useDocumentPropertiesPanelState()
    const extensions = computed(() => [
      {
        id: 'com.github.opencloud-eu.web.pdf-viewer.sidebar-panel.document-properties',
        type: 'sidebarPanel',
        extensionPointIds: ['global.files.sidebar'],
        panel: {
          name: documentPropertiesPanelName,
          icon: { name: 'file-pdf-2', fillType: 'line' },
          title: () => $gettext('Document properties'),
          component: markRaw(PdfDocumentProperties),
          componentAttrs: ({ items }) => ({
            properties: unref(properties),
            fileName: items[0].name,
            fileSize: Number(items[0].size) || undefined
          }),
          isVisible: ({ items }) =>
            !!unref(resourceId) && items?.length === 1 && items[0].id === unref(resourceId)
        }
      } satisfies SidebarPanelExtension<SpaceResource, Resource, Resource>
    ])

    return {
      appInfo,
      routes,
      translations,
      extensions
    }
  }
})
