import translations from '../l10n/translations.json'
import { useGettext } from 'vue3-gettext'
import { computed } from 'vue'

import {
  AppMenuItemExtension,
  defineWebApplication,
  Extension,
  useCapabilityStore
} from '@opencloud-eu/web-pkg'
import { urlJoin } from '@opencloud-eu/web-client'
import { RouteRecordRaw } from 'vue-router'
import { APPID } from './appid'

export default defineWebApplication({
  setup({ applicationConfig }) {
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
        path: '/',
        name: 'root',
        component: () => import('./LayoutContainer.vue'),
        redirect: urlJoin(appInfo.id, 'all', 'inbox'),

        meta: {
          authContext: 'user'
        },
        children: [
          {
            path: 'all',
            name: 'all',
            component: () => import('./EmptyLayoutContainer.vue'),
            meta: {
              authContext: 'user'
            },
            children: [
              {
                path: 'inbox',
                name: 'inbox',
                component: () => import('./views/Inbox.vue'),
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
