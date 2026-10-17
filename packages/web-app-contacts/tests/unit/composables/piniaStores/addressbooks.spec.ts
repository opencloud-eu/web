import { unref } from 'vue'
import { defaultComponentMocks, getComposableWrapper } from '@opencloud-eu/web-test-helpers'
import { useAddressBooksStore } from '../../../../src/composables/piniaStores/addressbooks'
import type { AddressBook } from '../../../../src/types'

const getAddressBook = (id: string, mayWrite: boolean): AddressBook => ({
  id,
  name: id,
  myRights: { mayAdmin: false, mayDelete: false, mayRead: true, mayWrite }
})

describe('address books store', () => {
  it.each([true, false])(
    'reflects the write permission of the current address book: %s',
    (mayWrite) => {
      getWrapper((store) => {
        const addressBook = getAddressBook('book', mayWrite)
        store.setAddressBooks([addressBook])
        store.setCurrentAddressBook(addressBook)

        expect(unref(store.canWriteCurrentAddressBook)).toBe(mayWrite)
      })
    }
  )

  it('is not writable without a current address book', () => {
    getWrapper((store) => {
      expect(unref(store.canWriteCurrentAddressBook)).toBe(false)
    })
  })
})

function getWrapper(setup: (store: ReturnType<typeof useAddressBooksStore>) => void) {
  const mocks = defaultComponentMocks()
  return getComposableWrapper(() => setup(useAddressBooksStore()), {
    mocks,
    provide: mocks,
    pluginOptions: { piniaOptions: { stubActions: false } }
  })
}
