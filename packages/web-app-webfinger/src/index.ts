import { useGettext } from 'vue3-gettext'
import translations from '../l10n/translations.json'
import { defineWebApplication } from '@opencloud-eu/web-pkg'
import Resolve from './views/Resolve.vue'

export default defineWebApplication({
  setup() {
    const { $gettext } = useGettext()

    const routes = [
      {
        name: 'webfinger-root',
        path: '/',
        redirect: () => {
          return { name: 'webfinger-resolve' }
        },
        meta: {
          authContext: 'anonymous'
        }
      },
      {
        path: '/resolve',
        name: 'webfinger-resolve',
        component: Resolve,
        meta: {
          authContext: 'idp',
          title: $gettext('Resolve destination'),
          entryPoint: true
        }
      }
    ]

    return {
      appInfo: {
        name: $gettext('Webfinger'),
        id: 'webfinger',
        icon: 'fingerprint'
      },
      routes,
      translations
    }
  }
})
