import { defineComponent, h } from 'vue'
import AppWrapper from './AppWrapper.vue'
import { AppWrapperSlotArgs } from './types'
import { FileContentOptions, UrlForResourceOptions } from '../../composables'
import { Resource } from '@opencloud-eu/web-client'

/**
 * @deprecated Prefer {@link resourceEditorRoute} together with a typed
 * `resourceEditor` extension. AppWrapperRoute still works (it delegates to the
 * legacy {@link AppWrapper} shim which synthesises a ResourceEditorExtension),
 * but new apps and migrations should use the new API directly.
 */
export function AppWrapperRoute(
  fileEditor: ReturnType<typeof defineComponent>,
  options: {
    applicationId: string
    urlForResourceOptions?: UrlForResourceOptions
    fileContentOptions?: FileContentOptions
    importResourceWithExtension?: (resource: Resource) => string
    disableAutoSave?: boolean
  }
) {
  return defineComponent({
    render() {
      return h(
        AppWrapper,
        {
          wrappedComponent: fileEditor,
          ...options
        },
        {
          default: (slotArgs: AppWrapperSlotArgs) => {
            return h(fileEditor, slotArgs)
          }
        }
      )
    }
  })
}
