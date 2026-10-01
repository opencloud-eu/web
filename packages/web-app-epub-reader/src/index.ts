import { useGettext } from 'vue3-gettext'
import translations from 'virtual:l10n/web-app-epub-reader'
import { AppWrapperRoute, defineWebApplication } from '@opencloud-eu/web-pkg'

export default defineWebApplication({
  setup() {
    const { $gettext } = useGettext()

    const appId = 'epub-reader'

    const routes = [
      {
        path: '/:driveAliasAndItem(.*)?',
        component: async () => {
          // lazy loading to avoid loading the epubjs package on page load
          const EpubReader = (await import('./App.vue')).default
          return AppWrapperRoute(EpubReader, {
            applicationId: appId,
            fileContentOptions: {
              responseType: 'blob'
            }
          })
        },
        name: 'epub-reader',
        meta: {
          authContext: 'hybrid',
          title: $gettext('Epub Reader'),
          patchCleanPath: true
        }
      }
    ]

    return {
      appInfo: {
        name: $gettext('Epub Reader'),
        id: appId,
        icon: 'book-read',
        extensions: [
          {
            extension: 'epub',
            routeName: 'epub-reader'
          }
        ]
      },
      routes,
      translations
    }
  }
})
