import { useGettext } from 'vue3-gettext'
import { Action } from '@opencloud-eu/web-pkg'
import { useContactEditor } from '../useContactEditor'
import type { Contact } from '../../types'

export const useContactActionsEdit = () => {
  const { $gettext } = useGettext()
  const { openEditContact } = useContactEditor()

  const getEditAction = (contact: Contact): Action => ({
    name: 'edit',
    icon: 'pencil',
    label: () => $gettext('Edit'),
    isVisible: () => true,
    handler: () => openEditContact(contact),
    class: 'contact-actions-edit-trigger'
  })

  return {
    getEditAction
  }
}
