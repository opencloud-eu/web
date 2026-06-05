import { useCapabilityStore, useClientService } from '@opencloud-eu/web-pkg'
import { CollaboratorAutoCompleteItem, ShareTypes } from '@opencloud-eu/web-client'

/**
 * Searches the Open-Xchange addressbook for contacts and maps them to share
 * recipients of type "guest". Only active when the `open_xchange.enabled`
 * capability is set.
 */
export const useOpenXchangeContacts = () => {
  const clientService = useClientService()
  const capabilityStore = useCapabilityStore()

  const searchContacts = async (
    query: string,
    signal?: AbortSignal
  ): Promise<CollaboratorAutoCompleteItem[]> => {
    if (!capabilityStore.openXchangeEnabled) {
      return []
    }

    try {
      const contacts = await clientService.ox.autocompleteContacts({ query, signal })
      return contacts.map((contact) => ({
        id: contact.email,
        displayName: contact.displayName || contact.email,
        mail: contact.email,
        shareType: ShareTypes.guest.value
      }))
    } catch (e) {
      console.error('Failed to load Open-Xchange contacts:', e)
      return []
    }
  }

  return { searchContacts }
}
