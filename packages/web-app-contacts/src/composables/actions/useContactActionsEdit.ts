import { computed } from 'vue'
import { useGettext } from 'vue3-gettext'
import { useContactEditor } from '../useContactEditor'
import type { ContactAction, ContactActionOptions } from './types'

export function useContactActionsEdit() {
  const { $gettext } = useGettext()
  const { openEditContact } = useContactEditor()

  function handler({ resources }: ContactActionOptions) {
    if (resources.length !== 1) {
      return
    }

    openEditContact(resources[0])
  }

  const actions = computed((): ContactAction[] => [
    {
      name: 'edit',
      icon: 'pencil',
      label: () => $gettext('Edit'),
      isVisible: ({ resources }) => resources.length === 1,
      handler,
      class: 'oc-contacts-actions-edit-trigger'
    }
  ])

  return {
    actions
  }
}
