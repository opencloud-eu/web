import translations from '../l10n/translations.json'
import { useGettext } from 'vue3-gettext'
import Appointments from './views/Calendar.vue'
import LayoutContainer from './LayoutContainer.vue'
import { defineWebApplication } from '@opencloud-eu/web-pkg'
import { APPID } from './appid'
import { RouteRecordRaw } from 'vue-router'
import { extensions } from './extensions'

export default defineWebApplication({
  setup() {
    const { $gettext } = useGettext()

    const appInfo = {
      name: $gettext('Appointments'),
      id: APPID,
      icon: 'calendar',
      color: '#2d7d46'
    }

    const routes: RouteRecordRaw[] = [
      {
        path: '',
        name: 'appointments-root',
        component: LayoutContainer,
        meta: {
          authContext: 'user'
        },
        children: [
          {
            path: '',
            name: 'appointments-month-view',
            component: Appointments,
            meta: {
              authContext: 'user',
              title: $gettext('Appointments')
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
