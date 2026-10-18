import { computed, unref } from 'vue'
import { useGettext } from 'vue3-gettext'
import { urlJoin } from '@opencloud-eu/web-client'
import {
  useClientService,
  useConfigStore,
  useGroupwareAccountsStore,
  useMessages,
  useModals
} from '@opencloud-eu/web-pkg'
import { useContactsStore } from '../piniaStores/contacts'
import { getContactDisplayName, getContactPrimaryEmail } from '../../helpers'
import type { Contact } from '../../types'
import type { ContactAction, ContactActionOptions } from './types'

export function useContactActionsDelete() {
  const { $gettext } = useGettext()
  const { showMessage, showErrorMessage } = useMessages()
  const { dispatchModal } = useModals()
  const clientService = useClientService()
  const configStore = useConfigStore()
  const accountsStore = useGroupwareAccountsStore()
  const contactsStore = useContactsStore()

  function getContactName(contact: Contact) {
    return getContactDisplayName(contact) || getContactPrimaryEmail(contact) || ''
  }

  async function deleteContact(contact: Contact) {
    const accountId = unref(accountsStore.currentAccount)?.accountId
    const name = getContactName(contact)

    try {
      if (!accountId) {
        throw new Error('No groupware account selected')
      }

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

  function handler({ resources }: ContactActionOptions) {
    if (!resources.length) {
      return
    }

    const [contact] = resources
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

  const actions = computed((): ContactAction[] => [
    {
      name: 'delete',
      icon: 'delete-bin',
      label: () => $gettext('Delete'),
      isVisible: ({ resources }) => resources.length === 1,
      handler,
      class: 'oc-contacts-actions-delete-trigger'
    }
  ])

  return {
    actions,
    // HACK: exported for unit tests:
    deleteContact
  }
}
