import translations from '../l10n/translations.json'
import { useGettext } from 'vue3-gettext'
import { computed } from 'vue'
import Inbox from './views/Inbox.vue'
import LayoutContainer from './LayoutContainer.vue'
import EmptyLayoutContainer from './EmptyLayoutContainer.vue'

import {
  AppMenuItemExtension,
  defineWebApplication,
  Extension,
  useCapabilityStore
} from '@opencloud-eu/web-pkg'
import { urlJoin } from '@opencloud-eu/web-client'
import { APPID } from './appid'
import { RouteRecordRaw } from 'vue-router'

export default defineWebApplication({
  setup() {
    const { $gettext } = useGettext()
    const capabilityStore = useCapabilityStore()

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

    const menuItemExtension: AppMenuItemExtension = {
      id: `app.${appInfo.id}.menuItem`,
      type: 'appMenuItem',
      label: () => appInfo.name,
      color: appInfo.color,
      icon: appInfo.icon,
      priority: 30,
      path: urlJoin(appInfo.id)
    }
    const extensions = computed(() => {
      const result: Extension[] = []

      if (capabilityStore.capabilities.groupware?.enabled) {
        result.push(menuItemExtension)
      }

      return result
    })

    return {
      appInfo,
      routes,
      translations,
      extensions
    }
  }
})
