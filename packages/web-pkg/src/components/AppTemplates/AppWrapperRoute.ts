import { defineComponent, h } from 'vue'
import AppWrapper from './AppWrapper.vue'
import { AppWrapperSlotHandlers, AppWrapperSlotProps, YjsOptions } from './types'
import { FileContentOptions, UrlForResourceOptions } from '../../composables'
import { Resource } from '@opencloud-eu/web-client'

export function AppWrapperRoute(
  fileEditor: ReturnType<typeof defineComponent>,
  options: {
    applicationId: string
    urlForResourceOptions?: UrlForResourceOptions
    fileContentOptions?: FileContentOptions
    importResourceWithExtension?: (resource: Resource) => string
    disableAutoSave?: boolean
    yjs?: YjsOptions
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
          default: (slotArgs: AppWrapperSlotProps & AppWrapperSlotHandlers) => {
            return h(fileEditor, slotArgs)
          }
        }
      )
    }
  })
}
