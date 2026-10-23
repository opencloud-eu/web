import { mock } from 'vitest-mock-extended'
import { unref } from 'vue'
import { ApplicationInformation, FloatingActionButtonExtension } from '@opencloud-eu/web-pkg'
import { defaultComponentMocks, getComposableWrapper } from '@opencloud-eu/web-test-helpers'
import { extensions } from '../../src/extensions'
import { useAddressBooksStore } from '../../src/composables/piniaStores/addressbooks'
import type { AddressBook } from '../../src/types'

const getAddressBook = (mayWrite: boolean): AddressBook => ({
  id: 'book-1',
  name: 'Contacts',
  myRights: { mayAdmin: false, mayDelete: false, mayRead: true, mayWrite }
})

describe('contacts app extensions', () => {
  describe('floating action button', () => {
    it.each([
      { addressBook: getAddressBook(true), isDisabled: false, tooltip: undefined },
      {
        addressBook: getAddressBook(false),
        isDisabled: true,
        tooltip: 'This address book is read-only'
      },
      { addressBook: undefined, isDisabled: true, tooltip: undefined }
    ])(
      'is disabled: $isDisabled with tooltip "$tooltip"',
      ({ addressBook, isDisabled, tooltip }) => {
        const { floatingActionButton } = getWrapper(addressBook)

        expect(floatingActionButton.isDisabled()).toBe(isDisabled)
        expect(floatingActionButton.tooltip()).toBe(tooltip)
      }
    )
  })
})

function getWrapper(addressBook?: AddressBook) {
  const mocks = defaultComponentMocks()
  let floatingActionButton: FloatingActionButtonExtension
  getComposableWrapper(
    () => {
      const addressBooksStore = useAddressBooksStore()
      // @ts-expect-error getters are writable in the testing pinia
      addressBooksStore.currentAddressBook = addressBook
      // @ts-expect-error getters are writable in the testing pinia
      addressBooksStore.canWriteCurrentAddressBook = !!addressBook?.myRights.mayWrite

      floatingActionButton = unref(
        extensions(mock<ApplicationInformation>({ id: 'contacts' }))
      ).find(({ type }) => type === 'floatingActionButton') as FloatingActionButtonExtension
    },
    {
      mocks,
      provide: mocks,
      pluginOptions: {
        piniaOptions: {
          capabilityState: { capabilities: { groupware: { enabled: true } } }
        }
      }
    }
  )
  return { floatingActionButton }
}
