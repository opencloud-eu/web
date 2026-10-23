import { unref } from 'vue'
import { useModals } from '@opencloud-eu/web-pkg'
import { getComposableWrapper } from '@opencloud-eu/web-test-helpers'
import { useContactEditor } from '../../../src/composables/useContactEditor'
import type { Contact } from '../../../src/types'

const contact: Contact = {
  id: 'contact-1',
  name: {
    components: [
      { kind: 'given', value: 'Ada' },
      { kind: 'surname', value: 'Lovelace' }
    ]
  }
}

describe('useContactEditor', () => {
  afterEach(() => {
    getComposableWrapper(() => {
      useContactEditor().closeEditor()
    })
  })

  it('opens the editor with the form state of the edited contact', () => {
    getComposableWrapper(() => {
      const { openEditContact, isEditorOpen, editedContact, formState, hasChanges } =
        useContactEditor()
      openEditContact(contact)

      expect(unref(isEditorOpen)).toBe(true)
      expect(unref(editedContact)).toEqual(contact)
      expect(unref(formState)).toMatchObject({ firstName: 'Ada', lastName: 'Lovelace' })
      expect(unref(hasChanges)).toBe(false)
    })
  })

  it('has changes once the form differs from the edited contact', () => {
    getComposableWrapper(() => {
      const { openEditContact, setFormState, formState, hasChanges } = useContactEditor()
      openEditContact(contact)
      setFormState({ ...unref(formState), firstName: 'Augusta' })

      expect(unref(hasChanges)).toBe(true)
    })
  })

  it('asks before discarding changes', async () => {
    let confirmation: Promise<boolean> | boolean
    getComposableWrapper(() => {
      const { openEditContact, setFormState, formState, markDirty, confirmDiscardChanges } =
        useContactEditor()
      openEditContact(contact)
      setFormState({ ...unref(formState), firstName: 'Augusta' })
      markDirty()
      confirmation = confirmDiscardChanges()
    })

    const { onConfirm } = vi.mocked(useModals().dispatchModal).mock.calls[0][0]
    onConfirm(undefined)
    await expect(confirmation).resolves.toBe(true)
  })

  it('discards without asking if nothing changed', () => {
    getComposableWrapper(() => {
      const { openEditContact, confirmDiscardChanges } = useContactEditor()
      openEditContact(contact)

      expect(confirmDiscardChanges()).toBe(true)
      expect(useModals().dispatchModal).not.toHaveBeenCalled()
    })
  })
})
