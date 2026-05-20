import { computed, defineAsyncComponent } from 'vue'
import { useGettext } from 'vue3-gettext'
import translations from '../l10n/translations.json'
import {
  defineWebApplication,
  resourceEditorRoute,
  type ResourceEditorExtension
} from '@opencloud-eu/web-pkg'

export default defineWebApplication({
  setup() {
    const { $gettext } = useGettext()
    const appId = 'epub-reader'

    // Defer the epubjs bundle until the editor actually renders.
    const EpubReader = defineAsyncComponent(() => import('./App.vue'))

    const extension: ResourceEditorExtension = {
      id: 'app.epub-reader',
      type: 'resourceEditor',
      appId,
      extensions: ['epub'],
      component: EpubReader,
      fileContentOptions: { responseType: 'blob' }
    }

    return {
      appInfo: {
        name: $gettext('Epub Reader'),
        id: appId,
        icon: 'book-read',
        extensions: [
          {
            extension: 'epub',
            routeName: appId
          }
        ]
      },
      routes: [resourceEditorRoute({ extension, meta: { title: $gettext('Epub Reader') } })],
      extensions: computed(() => [extension]),
      translations
    }
  }
})
