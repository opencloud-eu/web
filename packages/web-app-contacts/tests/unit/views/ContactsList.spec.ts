import { ref } from 'vue'
import { defaultComponentMocks, defaultPlugins, mount } from '@opencloud-eu/web-test-helpers'
import ContactsList from '../../../src/views/ContactsList.vue'
import { useLoadContacts } from '../../../src/composables/useLoadContacts'
import { useLoadAllContacts } from '../../../src/composables/useLoadAllContacts'
import { useContactsStore } from '../../../src/composables/piniaStores/contacts'
import { useAddressBooksStore } from '../../../src/composables/piniaStores/addressbooks'
import type { AddressBook, Contact } from '../../../src/types'
import { useGroupwareAccountsStore } from '@opencloud-eu/web-pkg'

vi.mock('../../../src/composables/useLoadContacts')
vi.mock('../../../src/composables/useLoadAllContacts')

const contacts: Contact[] = [
  {
    id: '1',
    name: { full: 'Grace Hopper' },
    emails: { e: { address: 'grace@example.org' } },
    addressBookIds: { book: true }
  },
  {
    id: '2',
    name: { full: 'Ada Lovelace' },
    emails: { e: { address: 'ada@example.org' } },
    addressBookIds: { book: true }
  }
]

const otherContact: Contact = {
  id: '3',
  name: { full: 'Adele Goldberg' },
  addressBookIds: { team: true }
}

const addressBook: AddressBook = {
  id: 'book',
  name: 'Personal',
  myRights: { mayAdmin: true, mayDelete: true, mayRead: true, mayWrite: true }
}

const teamAddressBook: AddressBook = { ...addressBook, id: 'team', name: 'Team' }

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

  it('searches the contacts of all address books', async () => {
    const { wrapper, loadAllContacts } = getWrapper()
    await wrapper.find('input').setValue('ad')

    expect(loadAllContacts).toHaveBeenCalledWith('account')
    const items = wrapper.findAll('.contacts-list-item')
    expect(items.map((item) => item.find('.font-bold').text())).toEqual([
      'Ada Lovelace',
      'Adele Goldberg'
    ])
    expect(items[0].find('.contacts-list-item-address-book').exists()).toBe(false)
    expect(items[1].find('.contacts-list-item-address-book').text()).toBe('Team')
  })

  it('shows the error state and retries loading', async () => {
    const { wrapper, reloadContacts } = getWrapper({ error: new Error() })
    expect(wrapper.find('#contacts-error').exists()).toBe(true)
    expect(wrapper.find('.contacts-list-item').exists()).toBe(false)

    await wrapper.find('#contacts-error button').trigger('click')
    expect(reloadContacts).toHaveBeenCalled()
  })
})

function getWrapper({
  contacts: storeContacts = contacts,
  error = undefined
}: { contacts?: Contact[]; error?: Error } = {}) {
  const reloadContacts = vi.fn()
  const loadAllContacts = vi.fn()
  vi.mocked(useLoadAllContacts).mockReturnValue({
    allContacts: ref([...contacts, otherContact]),
    loadedAccountId: ref('account'),
    loadAllContacts,
    isLoading: ref(false)
  } as unknown as ReturnType<typeof useLoadAllContacts>)
  vi.mocked(useLoadContacts).mockReturnValue({
    isLoading: ref(false),
    error: ref(error),
    reloadContacts
  } as unknown as ReturnType<typeof useLoadContacts>)

  const mocks = defaultComponentMocks()
  const plugins = defaultPlugins()
  useContactsStore().contacts = storeContacts
  const addressBooksStore = useAddressBooksStore()
  addressBooksStore.addressBooks = [addressBook, teamAddressBook]
  // @ts-expect-error getters are writable in the testing pinia
  addressBooksStore.currentAddressBook = addressBook
  // @ts-expect-error getters are writable in the testing pinia
  useGroupwareAccountsStore().currentAccount = { accountId: 'account' }

  return {
    reloadContacts,
    loadAllContacts,
    wrapper: mount(ContactsList, {
      global: { plugins, mocks, provide: mocks, stubs: { OcDrop: true, ContextActionMenu: true } }
    })
  }
}
