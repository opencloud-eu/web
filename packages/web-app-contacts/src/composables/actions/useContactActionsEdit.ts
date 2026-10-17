import { unref } from 'vue'
import { useGettext } from 'vue3-gettext'
import { Action } from '@opencloud-eu/web-pkg'
import { useContactEditor } from '../useContactEditor'
import { useAddressBooksStore } from '../piniaStores/addressbooks'
import type { Contact } from '../../types'

export const useContactActionsEdit = () => {
  const { $gettext } = useGettext()
  const { openEditContact } = useContactEditor()
  const addressBooksStore = useAddressBooksStore()

  const getEditAction = (contact: Contact): Action => ({
    name: 'edit',
    icon: 'pencil',
    label: () => $gettext('Edit'),
    isVisible: () => unref(addressBooksStore.canWriteCurrentAddressBook),
    handler: () => openEditContact(contact),
    class: 'contact-actions-edit-trigger'
  })

  return {
    getEditAction
  }
}
