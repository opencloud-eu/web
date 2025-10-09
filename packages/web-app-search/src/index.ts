import App from './App.vue'
import List from './views/List.vue'
import translations from '../l10n/translations.json'
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
      routes: [
        {
          name: 'search',
          path: '/',
          component: App,
          children: [
            {
              name: 'provider-list',
              path: 'list/:page?',
              component: List,
              meta: {
                authContext: 'user',
                contextQueryItems: ['term', 'provider']
              }
            }
          ]
        }
      ],
      translations,
      extensions: extensions(),
      extensionPoints: extensionPoints()
    }
  }
})
