import { unref } from 'vue'
import { useGettext } from 'vue3-gettext'
import { urlJoin } from '@opencloud-eu/web-client'
import {
  Action,
  useClientService,
  useConfigStore,
  useGroupwareAccountsStore,
  useMessages,
  useModals
} from '@opencloud-eu/web-pkg'
import { useContactsStore } from '../piniaStores/contacts'
import { useAddressBooksStore } from '../piniaStores/addressbooks'
import { getContactDisplayName, getContactPrimaryEmail } from '../../helpers'
import type { Contact } from '../../types'

export const useContactActionsDelete = () => {
  const { $gettext } = useGettext()
  const { showMessage, showErrorMessage } = useMessages()
  const { dispatchModal } = useModals()
  const clientService = useClientService()
  const configStore = useConfigStore()
  const accountsStore = useGroupwareAccountsStore()
  const contactsStore = useContactsStore()
  const addressBooksStore = useAddressBooksStore()

  const getContactName = (contact: Contact) => {
    return getContactDisplayName(contact) || getContactPrimaryEmail(contact) || ''
  }

  const deleteContact = async (contact: Contact) => {
    const accountId = unref(accountsStore.currentAccount)?.accountId
    const name = getContactName(contact)

    try {
      await clientService.httpAuthenticated.delete(
        urlJoin(configStore.groupwareUrl, `accounts/${accountId}/contacts/${contact.id}`)
      )

      contactsStore.removeContacts([contact])
      showMessage({
        title: name
          ? $gettext('Contact »%{contact}« was deleted successfully', { contact: name })
          : $gettext('Contact was deleted successfully')
      })
    } catch (error) {
      console.error('Failed to delete contact:', error)
      showErrorMessage({
        title: name
          ? $gettext('Failed to delete contact »%{contact}«', { contact: name })
          : $gettext('Failed to delete contact'),
        errors: [error]
      })
    }
  }

  const handler = (contact: Contact) => {
    const name = getContactName(contact)

    dispatchModal({
      title: name
        ? $gettext('Delete contact »%{contact}«?', { contact: name })
        : $gettext('Delete contact?'),
      message: $gettext('Are you sure you want to delete this contact? This cannot be undone.'),
      confirmText: $gettext('Delete'),
      hasInput: false,
      onConfirm: () => deleteContact(contact)
    })
  }

  const getDeleteAction = (contact: Contact): Action => ({
    name: 'delete',
    icon: 'delete-bin',
    label: () => $gettext('Delete'),
    isVisible: () => unref(addressBooksStore.canWriteCurrentAddressBook),
    handler: () => handler(contact),
    class: 'contact-actions-delete-trigger'
  })

  return {
    getDeleteAction,
    // HACK: exported for unit tests:
    deleteContact
  }
}
