import { useClientService, useConfigStore } from '@opencloud-eu/web-pkg'
import { Contact } from '@opencloud-eu/web-client/ox'

/**
 * Searches the Open-Xchange addressbook for contacts, which can be invited as
 * guests. Only active when the `config.options.oxAppSuite.enabled` option is set.
 */
export const useOpenXchangeContacts = () => {
  const clientService = useClientService()
  const configStore = useConfigStore()

  const searchContacts = async (query: string, signal?: AbortSignal): Promise<Contact[]> => {
    if (!configStore.options.oxAppSuite?.enabled) {
      return []
    }

    try {
      return await clientService.ox.autocompleteContacts({ query, signal })
    } catch (e) {
      console.error('Failed to load Open-Xchange contacts:', e)
      return []
    }
  }

  return { searchContacts }
}
