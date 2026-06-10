import { defineWebApplication, SidebarNavExtension } from '@opencloud-eu/web-pkg'
import translations from '../l10n/translations.json'
import { useGettext } from 'vue3-gettext'
import { computed } from 'vue'
import App from './App.vue'

export default defineWebApplication({
  setup() {
    const { $gettext } = useGettext()
    const appId = 'admin-settings/office'
    const appInfo = {
      name: $gettext('Office Settings'),
      id: appId
    }
    const extensions = computed<SidebarNavExtension[]>(() => [
      {
        id: 'com.github.opencloud-eu.web.admin-settings.left-nav.office',
        extensionPointIds: ['app.admin-settings.navItems'],
        type: 'sidebarNav',
        navItem: {
          isVisible: () => true,
          name: $gettext('Office'),
          icon: 'attachment',
          route: {
            path: `/${appId}`
          }
        }
      }
    ])
    const routes = [
      {
        path: '/',
        name: 'office',
        component: App,
        meta: {
          title: $gettext('Office Settings'),
          authContext: 'user'
        }
      }
    ]
    return {
      appInfo,
      routes,
      extensions,
      translations
    }
  }
})
