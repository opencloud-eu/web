import { mock } from 'vitest-mock-extended'
import { useGroupwareAccountsStore, useMessages, useModals } from '@opencloud-eu/web-pkg'
import { defaultComponentMocks, getComposableWrapper } from '@opencloud-eu/web-test-helpers'
import { useContactActionsDelete } from '../../../../src/composables/actions/useContactActionsDelete'
import { useContactsStore } from '../../../../src/composables/piniaStores/contacts'
import type { Contact } from '../../../../src/types'

const contact = mock<Contact>({
  id: 'contact-1',
  name: { full: 'Ada Lovelace' },
  emails: { e: { address: 'ada@example.org' } }
})

describe('useContactActionsDelete', () => {
  describe('method "getDeleteAction"', () => {
    it('asks for confirmation before deleting', () => {
      getWrapper({
        setup: ({ getDeleteAction }, { clientService }) => {
          getDeleteAction(contact).handler()

          const { dispatchModal } = useModals()
          expect(dispatchModal).toHaveBeenCalledWith(
            expect.objectContaining({ title: 'Delete contact »Ada Lovelace«?' })
          )
          expect(clientService.httpAuthenticated.delete).not.toHaveBeenCalled()
        }
      })
    })
  })

  describe('method "deleteContact"', () => {
    it('deletes the contact and removes it from the store', async () => {
      const { mocks } = getWrapper({
        setup: async ({ deleteContact }) => {
          await deleteContact(contact)
        }
      })
      await vi.waitFor(() => expect(useMessages().showMessage).toHaveBeenCalled())

      expect(mocks.$clientService.httpAuthenticated.delete).toHaveBeenCalledWith(
        expect.stringMatching(/\/groupware\/accounts\/account-1\/contacts\/contact-1$/)
      )
      expect(useContactsStore().removeContacts).toHaveBeenCalledWith([contact])
    })

    it('keeps the contact and shows an error if the request fails', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined)
      getWrapper({
        setup: async ({ deleteContact }, { clientService }) => {
          clientService.httpAuthenticated.delete.mockRejectedValue(new Error())
          await deleteContact(contact)
        }
      })
      await vi.waitFor(() => expect(useMessages().showErrorMessage).toHaveBeenCalled())

      expect(useContactsStore().removeContacts).not.toHaveBeenCalled()
    })
  })
})

function getWrapper({
  setup
}: {
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
      const accountsStore = useGroupwareAccountsStore()
      accountsStore.accounts = [{ accountId: 'account-1' } as (typeof accountsStore.accounts)[0]]
      // @ts-expect-error getters are writable in the testing pinia
      accountsStore.currentAccount = accountsStore.accounts[0]

      const instance = useContactActionsDelete()
      setup(instance, { clientService: mocks.$clientService })
    },
    { mocks, provide: mocks }
  )
  return { wrapper, mocks }
}
