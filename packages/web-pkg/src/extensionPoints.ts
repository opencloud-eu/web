import { CustomComponentExtension, ExtensionPoint } from './composables'
import { computed } from 'vue'

export const fileSideBarSpaceDetailsTableExtensionPoint: ExtensionPoint<CustomComponentExtension> =
  {
    id: 'app.files.sidebar.space-details.table',
    extensionType: 'customComponent'
  }

export const extensionPoints = () => {
  return computed<ExtensionPoint<any>[]>(() => {
    return [fileSideBarSpaceDetailsTableExtensionPoint]
  })
}
