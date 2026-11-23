import { unref } from 'vue'
import { flushPromises } from '@vue/test-utils'
import { defaultComponentMocks, getComposableWrapper } from '@opencloud-eu/web-test-helpers'
import { useMessages } from '@opencloud-eu/web-pkg'
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

  describe('method "getGuestCandidates"', () => {
    it('offers address book contacts as guests with the address the server stores', () => {
      const { instance } = getSearchWrapper()

      const candidates = instance.getGuestCandidates(
        'ja',
        [],
        [
          { id: '1', displayName: 'Jane', email: 'Jane@Müller.de' },
          { id: '2', displayName: '', email: 'john@example.com' }
        ]
      )

      expect(candidates).toEqual([
        {
          id: 'jane@xn--mller-kva.de',
          displayName: 'Jane',
          mail: 'jane@xn--mller-kva.de',
          shareType: ShareTypes.guest.value
        },
        {
          id: 'john@example.com',
          displayName: 'john@example.com',
          shareType: ShareTypes.guest.value
        }
      ])
    })
    it('leaves out contacts with an invalid address or one of a known account', () => {
      const { instance } = getSearchWrapper()
      const user = {
        id: '2',
        mail: 'mary@example.com',
        shareType: ShareTypes.user.value
      } as CollaboratorAutoCompleteItem

      const candidates = instance.getGuestCandidates(
        'ma',
        [user],
        [
          { id: '1', displayName: 'Mary', email: 'Mary@example.com' },
          { id: '2', displayName: 'Invalid', email: 'not-an-email' }
        ]
      )

      expect(candidates).toEqual([])
    })
    it('offers an entered address that is also a contact once, with the contact name', () => {
      const { instance } = getSearchWrapper()

      const candidates = instance.getGuestCandidates(
        'jane@example.com',
        [],
        [{ id: '1', displayName: 'Jane', email: 'jane@example.com' }]
      )

      expect(candidates).toEqual([
        expect.objectContaining({ id: 'jane@example.com', displayName: 'Jane' })
      ])
    })
    it.each([
      { name: 'its mail', user: { mail: 'mary@example.com' } },
      { name: 'its account name', user: { onPremisesSamAccountName: 'mary@example.com' } },
      { name: 'its mail in another case', user: { mail: 'MARY@Example.com' } },
      { name: 'its mail with a unicode domain', user: { mail: 'mary@xn--mller-kva.de' } }
    ])('leaves out a contact whose address matches a user by $name', ({ user }) => {
      const { instance } = getSearchWrapper()
      const collaborators = [
        { id: '1', mail: 'other@example.com', shareType: ShareTypes.user.value },
        { id: '2', ...user, shareType: ShareTypes.user.value }
      ] as CollaboratorAutoCompleteItem[]
      const email = user.mail?.includes('xn--') ? 'mary@müller.de' : 'mary@example.com'

      const candidates = instance.getGuestCandidates('ma', collaborators, [
        { id: '1', displayName: 'Mary', email }
      ])

      expect(candidates).toEqual([])
    })
    it('offers contacts when the search found a single user without a visible mail', () => {
      const { instance } = getSearchWrapper()
      const user = { id: '2', shareType: ShareTypes.user.value } as CollaboratorAutoCompleteItem

      const candidates = instance.getGuestCandidates(
        'ja',
        [user],
        [{ id: '1', displayName: 'Jane Doe', email: 'jane@partner.com' }]
      )

      expect(candidates).toEqual([expect.objectContaining({ id: 'jane@partner.com' })])
    })
    it('leaves out the entered address and its contact when a single user without a visible mail was found', () => {
      const { instance } = getSearchWrapper()
      const user = { id: '2', shareType: ShareTypes.user.value } as CollaboratorAutoCompleteItem

      const candidates = instance.getGuestCandidates(
        'jane@example.com',
        [user],
        [
          { id: '1', displayName: 'Jane', email: 'Jane@example.com' },
          { id: '2', displayName: 'John', email: 'john@example.com' }
        ]
      )

      expect(candidates).toEqual([expect.objectContaining({ id: 'john@example.com' })])
    })
    it.each([
      { canInvite: false, guestLinksEnabled: true },
      { canInvite: true, guestLinksEnabled: false }
    ])(
      'can not invite guests when guest invites are not possible (%o)',
      ({ canInvite, guestLinksEnabled }) => {
        const { instance } = getSearchWrapper({ canInvite, guestLinksEnabled })

        expect(unref(instance.canInviteGuests)).toBe(false)
      }
    )
  })
})

function getSearchWrapper({ canInvite = true, guestLinksEnabled = true } = {}) {
  const mocks = defaultComponentMocks()
  let instance: ReturnType<typeof useCollaboratorSearch>
  getComposableWrapper(
    () => {
      instance = useCollaboratorSearch()
    },
    {
      mocks,
      provide: mocks,
      pluginOptions: {
        abilities: canInvite ? [{ action: 'create-all', subject: 'GuestInvite' }] : [],
        piniaOptions: {
          capabilityState: {
            capabilities: { files_sharing: { guest_links: { enabled: guestLinksEnabled } } }
          }
        }
      }
    }
  )
  return { instance }
}

describe('useCollaboratorAutocomplete', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('stops the search progress when the search fails', async () => {
    vi.useFakeTimers()
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const fetchResults = vi.fn().mockRejectedValue(new Error('403'))
    let autocomplete: ReturnType<typeof useCollaboratorAutocomplete>
    getComposableWrapper(() => {
      autocomplete = useCollaboratorAutocomplete('search-input', fetchResults)
    })

    autocomplete.onSearch('mary')
    expect(unref(autocomplete.searchInProgress)).toBe(true)
    vi.runAllTimers()
    vi.useRealTimers()
    await flushPromises()

    expect(fetchResults).toHaveBeenCalledWith('mary', expect.anything())
    expect(unref(autocomplete.searchInProgress)).toBe(false)
  })

  it('reports a failed search instead of showing it as having no results', async () => {
    vi.useFakeTimers()
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const error = new Error('500')
    const wrapper = createAutocompleteWrapper({ fetchResults: vi.fn().mockRejectedValue(error) })
    focusSearchInput('mary')

    wrapper.vm.onSearch('mary')
    vi.runAllTimers()
    vi.useRealTimers()
    await flushPromises()

    expect(wrapper.vm.searchFailed).toBe(true)
    expect(useMessages().showErrorMessage).toHaveBeenCalledWith({
      title: 'Failed to search for users and groups',
      errors: [error]
    })

    wrapper.vm.onSearch('mar')
    expect(wrapper.vm.searchFailed).toBe(false)
  })

  it('reports nothing for a search that a newer one cancelled', async () => {
    vi.useFakeTimers()
    const fetchResults = vi
      .fn()
      .mockImplementationOnce(
        (_query: string, signal: AbortSignal) =>
          new Promise((_, reject) => {
            signal.addEventListener('abort', () => reject(new DOMException('', 'AbortError')))
          })
      )
      .mockResolvedValue([])
    const wrapper = createAutocompleteWrapper({ fetchResults })
    focusSearchInput('mary')

    // e.g. a refetch after switching the share type
    wrapper.vm.onSearch('mary')
    vi.runAllTimers()
    wrapper.vm.onSearch('mary')
    vi.runAllTimers()
    vi.useRealTimers()
    await flushPromises()

    expect(fetchResults).toHaveBeenCalledTimes(2)
    expect(fetchResults.mock.calls[0][1].aborted).toBe(true)
    expect(wrapper.vm.searchFailed).toBe(false)
    expect(useMessages().showErrorMessage).not.toHaveBeenCalled()
  })

  it('drops results of a previous search that resolves after the term changed', async () => {
    vi.useFakeTimers()
    let resolveFirst: (results: unknown[]) => void
    const fetchResults = vi
      .fn()
      .mockImplementationOnce(() => new Promise((resolve) => (resolveFirst = resolve)))
    let autocomplete: ReturnType<typeof useCollaboratorAutocomplete>
    getComposableWrapper(() => {
      autocomplete = useCollaboratorAutocomplete('search-input', fetchResults)
    })

    autocomplete.onSearch('mar')
    vi.runAllTimers()
    autocomplete.onSearch('mary')
    resolveFirst([{ id: '1', displayName: 'Mark' }])
    vi.useRealTimers()
    await flushPromises()

    expect(unref(autocomplete.autocompleteResults)).toEqual([])
    expect(unref(autocomplete.searchInProgress)).toBe(true)
  })

  it('drops a pending search when the term falls below the minimum search length', async () => {
    vi.useFakeTimers()
    const fetchResults = vi.fn().mockResolvedValue([{ id: '1', displayName: 'Mark' }])
    const wrapper = createAutocompleteWrapper({ minSearchLength: 2, fetchResults })

    wrapper.vm.onSearch('mar')
    wrapper.vm.onSearch('m')
    vi.runAllTimers()
    vi.useRealTimers()
    await flushPromises()

    expect(fetchResults).not.toHaveBeenCalled()
    expect(wrapper.vm.autocompleteResults).toEqual([])
  })

  it('drops a pending search on unmount', () => {
    vi.useFakeTimers()
    const fetchResults = vi.fn().mockResolvedValue([])
    const wrapper = createAutocompleteWrapper({ fetchResults })

    wrapper.vm.onSearch('mary')
    wrapper.unmount()
    vi.runAllTimers()
    vi.useRealTimers()

    expect(fetchResults).not.toHaveBeenCalled()
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
})

function focusSearchInput(value: string) {
  const input = document.createElement('input')
  input.id = 'search-input'
  input.value = value
  document.body.appendChild(input)
  input.focus()
}

function createAutocompleteWrapper({
  minSearchLength = 1,
  fetchResults = vi.fn().mockResolvedValue([])
} = {}) {
  const mocks = defaultComponentMocks()
  return getComposableWrapper(() => useCollaboratorAutocomplete('search-input', fetchResults), {
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
