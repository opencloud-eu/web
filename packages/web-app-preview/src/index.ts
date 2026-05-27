import { computed } from 'vue'
import {
  ApplicationInformation,
  defineWebApplication,
  resourceEditorRoute,
  type ResourceEditorExtension
} from '@opencloud-eu/web-pkg'
import translations from '../l10n/translations.json'
import * as app from './App.vue'
import { useGettext } from 'vue3-gettext'
import { mimeTypes } from './mimeTypes'
import { appId } from './utils'
import { extensionPoints } from './extensionPoints'

const { default: App } = app

export default defineWebApplication({
  setup() {
    const { $gettext } = useGettext()

    const extension: ResourceEditorExtension = {
      id: 'app.preview',
      type: 'resourceEditor',
      appId,
      mimeTypes,
      component: App,
      urlForResourceOptions: { disposition: 'inline' }
    }

    // Route name `media` gets namespaced by the runtime to `preview-media`
    // (applicationId-name), matching the routeName in appInfo.extensions.
    const route = resourceEditorRoute({
      extension,
      name: 'media',
      meta: { title: $gettext('Preview') }
    })

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
      routes: [route],
      extensions: computed(() => [extension]),
      translations,
      extensionPoints: extensionPoints()
    }
  }
})
