import { ref } from 'vue'
import { ContextActionMenu, MenuSection } from '@opencloud-eu/web-pkg'
import { defaultComponentMocks, defaultPlugins, mount } from '@opencloud-eu/web-test-helpers'
import ContactsList from '../../../src/views/ContactsList.vue'
import { useLoadContacts } from '../../../src/composables/useLoadContacts'
import { useContactsStore } from '../../../src/composables/piniaStores/contacts'
import { useAddressBooksStore } from '../../../src/composables/piniaStores/addressbooks'
import type { AddressBook, Contact } from '../../../src/types'

vi.mock('../../../src/composables/useLoadContacts')

const contacts: Contact[] = [
  { id: '1', name: { full: 'Grace Hopper' }, emails: { e: { address: 'grace@example.org' } } },
  { id: '2', name: { full: 'Ada Lovelace' }, emails: { e: { address: 'ada@example.org' } } }
]

const addressBook: AddressBook = {
  id: 'book',
  name: 'Personal',
  myRights: { mayAdmin: true, mayDelete: true, mayRead: true, mayWrite: true }
}

describe('ContactsList', () => {
  it('renders the contacts sorted by name', () => {
    const { wrapper } = getWrapper()
    const names = wrapper.findAll('.contacts-list-item .font-bold').map((el) => el.text())
    expect(names).toEqual(['Ada Lovelace', 'Grace Hopper'])
  })

  it('shows the empty state without contacts', () => {
    const { wrapper } = getWrapper({ contacts: [] })
    expect(wrapper.find('#contacts-empty').exists()).toBe(true)
  })

  it('shows the error state and retries loading', async () => {
    const { wrapper, reloadContacts } = getWrapper({ error: new Error() })
    expect(wrapper.find('#contacts-error').exists()).toBe(true)
    expect(wrapper.find('.contacts-list-item').exists()).toBe(false)

    await wrapper.find('#contacts-error button').trigger('click')
    expect(reloadContacts).toHaveBeenCalled()
  })

  it.each([
    { mayWrite: true, items: [['details', 'edit'], ['delete']] },
    { mayWrite: false, items: [['details']] }
  ])(
    'shows the contact actions if the address book is writable: $mayWrite',
    ({ mayWrite, items }) => {
      const { wrapper } = getWrapper({ mayWrite })
      const menuSections: MenuSection[] = wrapper
        .findAllComponents(ContextActionMenu)[0]
        .props('menuSections')
      expect(menuSections.map((section) => section.items.map(({ name }) => name))).toEqual(items)
    }
  )
})

function getWrapper({
  contacts: storeContacts = contacts,
  error = undefined,
  mayWrite = true
}: { contacts?: Contact[]; error?: Error; mayWrite?: boolean } = {}) {
  const reloadContacts = vi.fn()
  vi.mocked(useLoadContacts).mockReturnValue({
    isLoading: ref(false),
    error: ref(error),
    reloadContacts
  } as unknown as ReturnType<typeof useLoadContacts>)

  const mocks = defaultComponentMocks()
  const plugins = defaultPlugins()
  useContactsStore().contacts = storeContacts
  // @ts-expect-error getters are writable in the testing pinia
  useAddressBooksStore().currentAddressBook = addressBook
  // @ts-expect-error getters are writable in the testing pinia
  useAddressBooksStore().canWriteCurrentAddressBook = mayWrite

  return {
    reloadContacts,
    wrapper: mount(ContactsList, {
      global: {
        plugins,
        mocks,
        provide: mocks,
        stubs: { OcDrop: { template: '<div><slot /></div>' }, ContextActionMenu: true }
      }
    })
  }
}
