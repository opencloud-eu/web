import { defineWebApplication, SidebarNavExtension, useAbility } from '@opencloud-eu/web-pkg'
import translations from 'virtual:l10n/web-app-office-settings'
import { useGettext } from 'vue3-gettext'
import { computed } from 'vue'
import App from './App.vue'

export default defineWebApplication({
  setup() {
    const { $gettext } = useGettext()
    const { can } = useAbility()
    const appId = 'admin-settings/office'

    function canManageFonts() {
      return can('create-all', 'Font')
    }

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
          isVisible: canManageFonts,
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
        beforeEnter: () => {
          if (!canManageFonts()) {
            return { path: '/' }
          }
        },
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
