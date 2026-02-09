import translations from '../l10n/translations.json'
import { useGettext } from 'vue3-gettext'
import { computed, unref } from 'vue'
import {
  AppMenuItemExtension,
  defineWebApplication,
  Extension,
  useUserStore
} from '@opencloud-eu/web-pkg'
import { urlJoin } from '@opencloud-eu/web-client'
import { RouteRecordRaw } from 'vue-router'
import { APPID } from './appid'
import { storeToRefs } from 'pinia'

export default defineWebApplication({
  setup() {
    const { $gettext } = useGettext()
    const userStore = useUserStore()
    const { user } = storeToRefs(userStore)

    const appInfo = {
      name: $gettext('Activities'),
      id: APPID,
      icon: 'pulse',
      color: '#887ef1'
    }

    const routes: RouteRecordRaw[] = [
      {
        path: '/',
        name: 'root',
        component: () => import('./LayoutContainer.vue'),
        redirect: urlJoin(appInfo.id, 'list'),
        meta: {
          authContext: 'user'
        },
        children: [
          {
            path: 'list',
            name: 'list',
            component: () => import('./views/App.vue'),
            meta: {
              authContext: 'user',
              title: $gettext('Activities')
            }
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

      if (unref(user)) {
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
