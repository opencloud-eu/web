import { getComposableWrapper } from '@opencloud-eu/web-test-helpers'
import { useContactActionsEdit } from '../../../../src/composables/actions/useContactActionsEdit'
import { useAddressBooksStore } from '../../../../src/composables/piniaStores/addressbooks'
import { useContactEditor } from '../../../../src/composables/useContactEditor'
import type { Contact } from '../../../../src/types'

const contact: Contact = { id: 'contact-1', name: { full: 'Ada Lovelace' } }

describe('useContactActionsEdit', () => {
  it.each([true, false])('is only visible with write permission: %s', (canWrite) => {
    getComposableWrapper(() => {
      // @ts-expect-error getters are writable in the testing pinia
      useAddressBooksStore().canWriteCurrentAddressBook = canWrite
      const { getEditAction } = useContactActionsEdit()
      expect(getEditAction(contact).isVisible()).toBe(canWrite)
    })
  })

  it('opens the editor with the contact', () => {
    getComposableWrapper(() => {
      const { getEditAction } = useContactActionsEdit()
      getEditAction(contact).handler()

      const { isEditorOpen, editedContact } = useContactEditor()
      expect(isEditorOpen.value).toBe(true)
      expect(editedContact.value).toEqual(contact)
    })
  })
})
