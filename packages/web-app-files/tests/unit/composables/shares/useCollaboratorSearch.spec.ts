import { unref } from 'vue'
import { flushPromises } from '@vue/test-utils'
import { defaultComponentMocks, getComposableWrapper } from '@opencloud-eu/web-test-helpers'
import { CollaboratorAutoCompleteItem, ShareTypes } from '@opencloud-eu/web-client'
import {
  useCollaboratorAutocomplete,
  useCollaboratorSearch
} from '../../../../src/composables/shares'

describe('useCollaboratorSearch', () => {
  describe('method "searchCollaborators"', () => {
    it('searches users and groups with the trimmed term', async () => {
      const mocks = defaultComponentMocks()
      mocks.$clientService.graphAuthenticated.users.listUsers.mockResolvedValue([])
      mocks.$clientService.graphAuthenticated.groups.listGroups.mockResolvedValue([])

      const wrapper = getComposableWrapper(() => useCollaboratorSearch(), {
        mocks,
        provide: mocks
      })
      await wrapper.vm.searchCollaborators(' mary ')

      expect(mocks.$clientService.graphAuthenticated.users.listUsers).toHaveBeenCalledWith(
        expect.objectContaining({ search: '"mary"' }),
        expect.anything()
      )
      expect(mocks.$clientService.graphAuthenticated.groups.listGroups).toHaveBeenCalledWith(
        expect.objectContaining({ search: '"mary"' }),
        expect.anything()
      )
    })
  })
})

describe('useCollaboratorAutocomplete', () => {
  it('stops the search progress when the search fails', async () => {
    vi.useFakeTimers()
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const fetchResults = vi.fn().mockRejectedValue(new Error('403'))
    let autocomplete: ReturnType<typeof useCollaboratorAutocomplete>
    getComposableWrapper(() => {
      autocomplete = useCollaboratorAutocomplete(fetchResults)
    })

    autocomplete.onSearch('mary')
    expect(unref(autocomplete.searchInProgress)).toBe(true)
    vi.runAllTimers()
    vi.useRealTimers()
    await flushPromises()

    expect(fetchResults).toHaveBeenCalledWith('mary', expect.anything())
    expect(unref(autocomplete.searchInProgress)).toBe(false)
  })

  describe('method "onSearch"', () => {
    it('does not count surrounding spaces towards the minimum search length', () => {
      const wrapper = createAutocompleteWrapper({ minSearchLength: 3 })
      wrapper.vm.onSearch('  ab  ')
      expect(wrapper.vm.searchInProgress).toBe(false)
    })
    it('searches once the trimmed term reaches the minimum search length', () => {
      const wrapper = createAutocompleteWrapper({ minSearchLength: 3 })
      wrapper.vm.onSearch(' abc')
      expect(wrapper.vm.searchInProgress).toBe(true)
    })
  })
  describe('method "filterRecipients"', () => {
    it('matches recipients for a term with surrounding spaces', () => {
      const wrapper = createAutocompleteWrapper()
      const recipients = [
        { displayName: 'Mary', mail: 'mary@example.org', shareType: ShareTypes.user.value },
        { displayName: 'Paul', mail: 'paul@example.org', shareType: ShareTypes.user.value }
      ] as CollaboratorAutoCompleteItem[]

      expect(wrapper.vm.filterRecipients(recipients, ' mary ')).toEqual([recipients[0]])
    })
  })
})

function createAutocompleteWrapper({ minSearchLength = 1 } = {}) {
  const mocks = defaultComponentMocks()
  return getComposableWrapper(() => useCollaboratorAutocomplete(vi.fn().mockResolvedValue([])), {
    mocks,
    provide: mocks,
    pluginOptions: {
      piniaOptions: {
        capabilityState: {
          capabilities: { files_sharing: { search_min_length: minSearchLength } }
        }
      }
    }
  })
}
