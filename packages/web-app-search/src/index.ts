import translations from 'virtual:l10n/web-app-search'
import { defineWebApplication } from '@opencloud-eu/web-pkg'
import { extensions } from './extensions'
import { extensionPoints } from './extensionPoints'
import { useGettext } from 'vue3-gettext'

export default defineWebApplication({
  setup() {
    const { $gettext } = useGettext()

    return {
      appInfo: {
        name: $gettext('Search'),
        id: 'search',
        icon: 'folder'
      },
      translations,
      extensions: extensions(),
      extensionPoints: extensionPoints()
    }
  }
})
