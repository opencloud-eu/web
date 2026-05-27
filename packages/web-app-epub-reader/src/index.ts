import { computed } from 'vue'
import { useGettext } from 'vue3-gettext'
import translations from '../l10n/translations.json'
import {
  defineWebApplication,
  resourceEditorRoute,
  type ResourceEditorExtension
} from '@opencloud-eu/web-pkg'
import EpubReader from './App.vue'

export default defineWebApplication({
  setup() {
    const { $gettext } = useGettext()
    const appId = 'epub-reader'

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
