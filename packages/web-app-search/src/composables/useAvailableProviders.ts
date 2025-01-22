import { SearchProvider, useExtensionRegistry } from '@opencloud-eu/web-pkg'
import { computed, Ref } from 'vue'
import { searchProviderExtensionPoint } from '../extensionPoints'

export const useAvailableProviders = (): Ref<SearchProvider[]> => {
  const extensionRegistry = useExtensionRegistry()

  return computed(() => {
    return extensionRegistry
      .requestExtensions(searchProviderExtensionPoint)
      .map(({ searchProvider }) => searchProvider)
  })
}
