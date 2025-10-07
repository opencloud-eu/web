import { ExtensionPoint, SearchExtension } from '@opencloud-eu/web-pkg'
import { computed } from 'vue'

export const searchProviderExtensionPoint: ExtensionPoint<SearchExtension> = {
  id: 'app.search.provider',
  extensionType: 'search',
  multiple: true
}

export const extensionPoints = () => {
  return computed<ExtensionPoint<SearchExtension>[]>(() => {
    return [searchProviderExtensionPoint]
  })
}
