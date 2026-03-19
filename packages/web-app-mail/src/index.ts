import translations from '../l10n/translations.json'
import { useGettext } from 'vue3-gettext'
import Inbox from './views/Inbox.vue'
import LayoutContainer from './LayoutContainer.vue'
import EmptyLayoutContainer from './EmptyLayoutContainer.vue'
import { defineWebApplication } from '@opencloud-eu/web-pkg'
import { APPID } from './appid'
import { RouteRecordRaw } from 'vue-router'
import { extensions } from './extensions'

export default defineWebApplication({
  setup() {
    const { $gettext } = useGettext()

    const appInfo = {
      name: $gettext('Mail'),
      id: APPID,
      icon: 'mail',
      color: '#0478d4'
    }

    const routes: RouteRecordRaw[] = [
      {
        path: '',
        name: 'mail-root',
        component: LayoutContainer,
        meta: {
          authContext: 'user'
        },
        children: [
          {
            path: '',
            redirect: { name: 'mail-all-inbox' }
          },
          {
            path: 'all',
            name: 'mail-all',
            component: EmptyLayoutContainer,
            redirect: { name: 'mail-all-inbox' },
            meta: {
              authContext: 'user'
            },
            children: [
              {
                path: 'inbox',
                name: 'mail-all-inbox',
                component: Inbox,
                meta: {
                  authContext: 'user',
                  title: $gettext('All emails')
                }
              }
            ]
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
