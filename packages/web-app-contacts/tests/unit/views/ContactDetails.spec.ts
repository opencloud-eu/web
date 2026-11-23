import { defaultComponentMocks, defaultPlugins, mount } from '@opencloud-eu/web-test-helpers'
import ContactDetails from '../../../src/views/ContactDetails.vue'
import { useContactsStore } from '../../../src/composables/piniaStores/contacts'
import { useAddressBooksStore } from '../../../src/composables/piniaStores/addressbooks'
import type { Contact } from '../../../src/types'

const contact: Contact = { id: 'contact-1', name: { full: 'Ada Lovelace' } }

describe('ContactDetails', () => {
  it('shows edit and delete in writable address books', () => {
    const { wrapper } = getWrapper({ canWrite: true })
    expect(wrapper.find('.contact-details-edit').exists()).toBe(true)
    expect(wrapper.find('.contact-details-delete').exists()).toBe(true)
    expect(wrapper.find('.contact-details-read-only').exists()).toBe(false)
  })

  it('marks contacts in read-only address books as read-only', () => {
    const { wrapper } = getWrapper({ canWrite: false })
    expect(wrapper.find('.contact-details-edit').exists()).toBe(false)
    expect(wrapper.find('.contact-details-delete').exists()).toBe(false)
    expect(wrapper.find('.contact-details-read-only').exists()).toBe(true)
  })
})

function getWrapper({ canWrite }: { canWrite: boolean }) {
  const mocks = defaultComponentMocks()
  const plugins = defaultPlugins()
  const contactsStore = useContactsStore()
  // @ts-expect-error getters are writable in the testing pinia
  contactsStore.currentContact = contact
  // @ts-expect-error getters are writable in the testing pinia
  useAddressBooksStore().canWriteCurrentAddressBook = canWrite

  return {
    wrapper: mount(ContactDetails, {
      global: {
        plugins,
        mocks,
        provide: mocks,
        stubs: { ContactDetailsContent: true }
      }
    })
  }
}
