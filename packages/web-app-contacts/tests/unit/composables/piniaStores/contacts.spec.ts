import { unref } from 'vue'
import { defaultComponentMocks, getComposableWrapper } from '@opencloud-eu/web-test-helpers'
import { useContactsStore } from '../../../../src/composables/piniaStores/contacts'
import type { Contact } from '../../../../src/types'

const ada: Contact = { id: '1', name: { full: 'Ada' } }
const grace: Contact = { id: '2', name: { full: 'Grace' } }

describe('contacts store', () => {
  it('upserts contacts', () => {
    getWrapper((store) => {
      store.setContacts([ada])
      store.upsertContact({ id: '1', name: { full: 'Ada Lovelace' } })
      store.upsertContact(grace)

      expect(unref(store.contacts).map(({ name }) => name.full)).toEqual(['Ada Lovelace', 'Grace'])
    })
  })

  it('clears the current contact when it is removed', () => {
    getWrapper((store) => {
      store.setContacts([ada, grace])
      store.setCurrentContact(ada)
      expect(unref(store.currentContact)).toEqual(ada)

      store.removeContacts([ada])

      expect(unref(store.contacts)).toEqual([grace])
      expect(unref(store.currentContact)).toBeUndefined()
    })
  })
})

function getWrapper(setup: (store: ReturnType<typeof useContactsStore>) => void) {
  const mocks = defaultComponentMocks()
  return getComposableWrapper(() => setup(useContactsStore()), {
    mocks,
    provide: mocks,
    pluginOptions: { piniaOptions: { stubActions: false } }
  })
}
