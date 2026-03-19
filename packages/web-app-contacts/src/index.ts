import translations from '../l10n/translations.json'
import { useGettext } from 'vue3-gettext'
import Contacts from './views/Contacts.vue'
import LayoutContainer from './LayoutContainer.vue'

import { defineWebApplication } from '@opencloud-eu/web-pkg'
import { APPID } from './appid'
import { RouteRecordRaw } from 'vue-router'
import { extensions } from './extensions'

export default defineWebApplication({
  setup() {
    const { $gettext } = useGettext()

    const appInfo = {
      name: $gettext('Contacts'),
      id: APPID,
      icon: 'contacts-book-2',
      color: '#1d8cf8'
    }

    const routes: RouteRecordRaw[] = [
      {
        path: '',
        name: 'contacts-root',
        component: LayoutContainer,
        meta: {
          authContext: 'user'
        },
        children: [
          {
            path: '',
            name: 'contacts-view',
            component: Contacts,
            meta: {
              authContext: 'user',
              title: $gettext('Contacts')
            }
          }
        ]
      }
    ]

    return {
      appInfo,
      routes,
      translations,
      extensions: extensions(appInfo)
    }
  }
})
