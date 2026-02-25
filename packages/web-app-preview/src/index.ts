import {
  ApplicationInformation,
  AppWrapperRoute,
  defineWebApplication
} from '@opencloud-eu/web-pkg'
import translations from '../l10n/translations.json'
import * as app from './App.vue'
import { useGettext } from 'vue3-gettext'
import { mimeTypes } from './mimeTypes'
import { appId } from './utils'

const { default: App } = app

export default defineWebApplication({
  setup() {
    const { $gettext } = useGettext()

    const routes = [
      {
        path: '/:driveAliasAndItem(.*)?',
        component: AppWrapperRoute(App, {
          applicationId: appId,
          urlForResourceOptions: {
            disposition: 'inline'
          }
        }),
        name: 'media',
        meta: {
          authContext: 'hybrid',
          title: $gettext('Preview'),
          patchCleanPath: true
        }
      }
    ]

    const routeName = 'preview-media'

    const appInfo: ApplicationInformation = {
      name: $gettext('Preview'),
      id: appId,
      icon: 'eye',
      extensions: mimeTypes.map((mimeType) => ({
        mimeType,
        routeName,
        label: () => $gettext('Preview')
      }))
    }

    return {
      appInfo,
      routes,
      translations
    }
  }
})
