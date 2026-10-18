import { unref } from 'vue'
import { useGroupwareAccountsStore, useMessages, useModals } from '@opencloud-eu/web-pkg'
import { defaultComponentMocks, getComposableWrapper } from '@opencloud-eu/web-test-helpers'
import { useContactActionsDelete } from '../../../../src/composables/actions/useContactActionsDelete'
import { useContactsStore } from '../../../../src/composables/piniaStores/contacts'
import type { Contact } from '../../../../src/types'

const contact: Contact = {
  id: 'contact-1',
  name: { full: 'Ada Lovelace' },
  emails: { e: { address: 'ada@example.org' } }
}

describe('useContactActionsDelete', () => {
  describe('isVisible property', () => {
    it.each([
      { resources: [], expected: false },
      { resources: [contact], expected: true },
      { resources: [contact, { ...contact, id: 'contact-2' }], expected: false }
    ])('is $expected for $resources.length contacts', ({ resources, expected }) => {
      getWrapper({
        setup: ({ actions }) => {
          expect(unref(actions)[0].isVisible({ resources })).toBe(expected)
        }
      })
    })
  })

  describe('handler', () => {
    it('asks for confirmation before deleting', () => {
      getWrapper({
        setup: ({ actions }, { clientService }) => {
          unref(actions)[0].handler({ resources: [contact] })

          expect(useModals().dispatchModal).toHaveBeenCalledWith(
            expect.objectContaining({ title: 'Delete contact »Ada Lovelace«?' })
          )
          expect(clientService.httpAuthenticated.delete).not.toHaveBeenCalled()
        }
      })
    })

    it('deletes the contact once the deletion is confirmed', async () => {
      const { mocks } = getWrapper({
        setup: ({ actions }) => {
          unref(actions)[0].handler({ resources: [contact] })
        }
      })

      const { onConfirm } = vi.mocked(useModals().dispatchModal).mock.calls[0][0]
      await onConfirm(undefined)

      expect(mocks.$clientService.httpAuthenticated.delete).toHaveBeenCalledWith(
        expect.stringMatching(/\/groupware\/accounts\/account-1\/contacts\/contact-1$/)
      )
    })

    it('falls back to a generic title if the contact has neither name nor email', () => {
      getWrapper({
        setup: ({ actions }) => {
          unref(actions)[0].handler({ resources: [{ id: 'contact-2' }] })

          expect(useModals().dispatchModal).toHaveBeenCalledWith(
            expect.objectContaining({ title: 'Delete contact?' })
          )
        }
      })
    })
  })

  describe('method "deleteContact"', () => {
    it('deletes the contact and removes it from the store', async () => {
      let instance: ReturnType<typeof useContactActionsDelete>
      const { mocks } = getWrapper({
        setup: (value) => {
          instance = value
        }
      })

      await instance.deleteContact(contact)

      expect(mocks.$clientService.httpAuthenticated.delete).toHaveBeenCalledWith(
        expect.stringMatching(/\/groupware\/accounts\/account-1\/contacts\/contact-1$/)
      )
      expect(useContactsStore().removeContacts).toHaveBeenCalledWith([contact])
      expect(useMessages().showMessage).toHaveBeenCalledWith({
        title: 'Contact »Ada Lovelace« was deleted successfully'
      })
    })

    it('keeps the contact and shows an error if the request fails', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined)
      const error = new Error('request failed')
      let instance: ReturnType<typeof useContactActionsDelete>
      const { mocks } = getWrapper({
        setup: (value) => {
          instance = value
        }
      })
      mocks.$clientService.httpAuthenticated.delete.mockRejectedValue(error)

      await instance.deleteContact(contact)

      expect(useContactsStore().removeContacts).not.toHaveBeenCalled()
      expect(useMessages().showErrorMessage).toHaveBeenCalledWith({
        title: 'Failed to delete contact »Ada Lovelace«',
        errors: [error]
      })
    })

    it('does not send a request without a current account', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined)
      let instance: ReturnType<typeof useContactActionsDelete>
      const { mocks } = getWrapper({
        hasAccount: false,
        setup: (value) => {
          instance = value
        }
      })

      await instance.deleteContact(contact)

      expect(mocks.$clientService.httpAuthenticated.delete).not.toHaveBeenCalled()
      expect(useContactsStore().removeContacts).not.toHaveBeenCalled()
      expect(useMessages().showErrorMessage).toHaveBeenCalled()
    })
  })
})

function getWrapper({
  hasAccount = true,
  setup
}: {
  hasAccount?: boolean
  setup: (
    instance: ReturnType<typeof useContactActionsDelete>,
    {
      clientService
    }: {
      clientService: ReturnType<typeof defaultComponentMocks>['$clientService']
    }
  ) => void
}) {
  const mocks = defaultComponentMocks()
  const wrapper = getComposableWrapper(
    () => {
      if (hasAccount) {
        const accountsStore = useGroupwareAccountsStore()
        accountsStore.accounts = [{ accountId: 'account-1' } as (typeof accountsStore.accounts)[0]]
        // @ts-expect-error getters are writable in the testing pinia
        accountsStore.currentAccount = accountsStore.accounts[0]
      }

      const instance = useContactActionsDelete()
      setup(instance, { clientService: mocks.$clientService })
    },
    { mocks, provide: mocks }
  )
  return { wrapper, mocks }
}
