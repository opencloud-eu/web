import { unref } from 'vue'
import { getComposableWrapper } from '@opencloud-eu/web-test-helpers'
import { useContactActionsEdit } from '../../../../src/composables/actions/useContactActionsEdit'
import { useAddressBooksStore } from '../../../../src/composables/piniaStores/addressbooks'
import { useContactEditor } from '../../../../src/composables/useContactEditor'
import type { Contact } from '../../../../src/types'

const contact: Contact = { id: 'contact-1', name: { full: 'Ada Lovelace' } }

describe('useContactActionsEdit', () => {
  describe('isVisible property', () => {
    it.each([
      { resources: [], expected: false },
      { resources: [contact], expected: true },
      { resources: [contact, { ...contact, id: 'contact-2' }], expected: false }
    ])('is $expected for $resources.length contacts', ({ resources, expected }) => {
      getComposableWrapper(() => {
        // @ts-expect-error getters are writable in the testing pinia
        useAddressBooksStore().canWriteCurrentAddressBook = true
        const { actions } = useContactActionsEdit()
        expect(unref(actions)[0].isVisible({ resources })).toBe(expected)
      })
    })

    it.each([true, false])('is only visible with write permission: %s', (canWrite) => {
      getComposableWrapper(() => {
        // @ts-expect-error getters are writable in the testing pinia
        useAddressBooksStore().canWriteCurrentAddressBook = canWrite
        const { actions } = useContactActionsEdit()
        expect(unref(actions)[0].isVisible({ resources: [contact] })).toBe(canWrite)
      })
    })
  })

  describe('handler', () => {
    it('opens the editor with the contact', () => {
      getComposableWrapper(() => {
        const { actions } = useContactActionsEdit()
        unref(actions)[0].handler({ resources: [contact] })

        const { isEditorOpen, editedContact } = useContactEditor()
        expect(isEditorOpen.value).toBe(true)
        expect(editedContact.value).toEqual(contact)
      })
    })
  })
})
