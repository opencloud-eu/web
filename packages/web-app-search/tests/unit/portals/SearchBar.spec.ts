import SearchBar from '../../../src/portals/SearchBar.vue'
import { enableAutoUnmount, flushPromises, RouterLinkStub } from '@vue/test-utils'
import { mock } from 'vitest-mock-extended'
import { markRaw, nextTick, ref, shallowRef } from 'vue'
import { defineComponent } from 'vue'
import {
  defaultPlugins,
  mount,
  defaultComponentMocks,
  ocDropStub,
  writable
} from '@opencloud-eu/web-test-helpers'
import { useAvailableProviders } from '../../../src/composables'
import {
  eventBus,
  SearchBarFilter,
  SearchLocationFilterConstants,
  SearchResult,
  useResourcesStore
} from '@opencloud-eu/web-pkg'
import { OcFilterChip } from '@opencloud-eu/design-system/components'
import { Resource } from '@opencloud-eu/web-client'
import { Router, RouteLocationNormalizedLoaded } from 'vue-router'
import { debounce } from 'lodash-es'

const component = defineComponent({
  emits: ['click', 'keyup'],
  setup(props, ctx) {
    const onClick = (event: Event) => {
      ctx.emit('click', event)
    }
    return { onClick }
  },
  template: '<div @click="onClick"></div>'
})

const providerFiles = {
  id: 'files',
  displayName: 'Files',
  available: true,
  previewSearch: {
    available: true,
    search: vi.fn(),
    component: markRaw(component)
  },
  listSearch: {}
}

const providerContacts = {
  id: 'contacts',
  displayName: 'Contacts',
  available: true,
  previewSearch: {
    available: true,
    search: vi.fn(),
    component: markRaw(component)
  }
}

const selectors = {
  search: '#files-global-search',
  noResults: '#no-results',
  searchInput: 'input',
  searchInputClear: '.oc-search-clear',
  providerListItem: '.provider',
  providerDisplayName: '.provider .display-name',
  providerMoreResultsLink: '.provider .more-results',
  searchFilters: '#files-global-search-filter'
}

vi.mock('lodash-es', () => ({
  debounce: vi.fn((fn) => {
    fn.cancel = vi.fn()
    return fn
  }),
  kebabCase: (fn: unknown) => fn
}))
vi.mock('../../../src/composables/useAvailableProviders')
vi.mock('@opencloud-eu/web-pkg', async (importOriginal) => ({
  ...(await importOriginal<any>()),
  useIsAppActive: () => false
}))

enableAutoUnmount(afterEach)

beforeEach(() => {
  providerFiles.previewSearch.search.mockImplementation(() => {
    return {
      values: [
        { id: 'f1', data: 'albert.txt' },
        { id: 'f2', data: 'marie.txt' }
      ]
    }
  })

  providerContacts.previewSearch.search.mockImplementation(() => {
    return {
      values: [
        { id: 'c1', data: 'albert' },
        { id: 'c2', data: 'marie' }
      ]
    }
  })
})

describe('Search Bar portal component', () => {
  test('does not render a search field if no availableProviders given', () => {
    const { wrapper } = getMountedWrapper({ providers: [] })
    expect(wrapper.find(selectors.search).exists()).toBeFalsy()
  })
  test('does not render a search field if no user given', () => {
    const { wrapper } = getMountedWrapper({ userContextReady: false })
    expect(wrapper.find(selectors.search).exists()).toBeFalsy()
  })
  test('updates the search term on input', () => {
    const { wrapper } = getMountedWrapper()
    wrapper.find(selectors.searchInput).setValue('alice')
    expect((wrapper.vm as any).term).toBe('alice')
  })
  test('ignores spaces around the term in the preview search but keeps them in the input', async () => {
    const { wrapper } = getMountedWrapper()
    wrapper.find(selectors.searchInput).setValue(' albert ')
    await flushPromises()
    expect((wrapper.vm as any).term).toBe(' albert ')
    expect(providerFiles.previewSearch.search).toHaveBeenLastCalledWith(
      expect.stringContaining('name:"*albert*"')
    )
  })
  test('does not search if the term consists of spaces only', async () => {
    const { wrapper } = getMountedWrapper()
    providerFiles.previewSearch.search.mockClear()
    wrapper.find(selectors.searchInput).setValue('   ')
    await flushPromises()
    expect(providerFiles.previewSearch.search).not.toHaveBeenCalled()
  })
  test('shows message if no results are available', async () => {
    const { wrapper } = getMountedWrapper()
    providerFiles.previewSearch.search.mockReturnValueOnce({ values: [] })
    providerContacts.previewSearch.search.mockReturnValueOnce({ values: [] })
    wrapper.find(selectors.searchInput).setValue('nothing found')
    await flushPromises()
    expect(wrapper.find(selectors.noResults)).toBeTruthy()
  })
  test('stops loading and shows the other results if a provider search fails', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const { wrapper } = getMountedWrapper()
    providerFiles.previewSearch.search.mockRejectedValueOnce(new Error('500'))
    wrapper.find(selectors.searchInput).setValue('kiwi\\')
    await flushPromises()
    expect((wrapper.vm as any).loading).toBe(false)
    expect(wrapper.findAll(selectors.providerListItem).length).toEqual(1)
    expect(consoleErrorSpy).toHaveBeenCalled()
  })
  test('ignores the results of an outdated search', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const { wrapper } = getMountedWrapper({ providers: [providerFiles] })
    let cancelFirstSearch: (e: Error) => void
    providerFiles.previewSearch.search.mockImplementationOnce(
      () => new Promise((_, reject) => (cancelFirstSearch = reject))
    )
    wrapper.find(selectors.searchInput).setValue('kiwi')
    await flushPromises()
    wrapper.find(selectors.searchInput).setValue('kiwis')
    cancelFirstSearch(new Error('cancel'))
    await flushPromises()
    expect((wrapper.vm as any).searchResults).toEqual([
      { providerId: 'files', result: expect.objectContaining({ values: expect.any(Array) }) }
    ])
    expect((wrapper.vm as any).searchResults[0].result.values.length).toBe(2)
  })
  test('stops loading when the term is cleared while a search is running', async () => {
    const { wrapper } = getMountedWrapper({ providers: [providerFiles] })
    providerFiles.previewSearch.search.mockImplementationOnce(() => new Promise(() => undefined))
    wrapper.find(selectors.searchInput).setValue('kiwi')
    await flushPromises()
    expect((wrapper.vm as any).loading).toBe(true)
    const vm = wrapper.vm as any
    vm.term = ''
    await vm.search()
    expect((wrapper.vm as any).loading).toBe(false)
  })
  test('displays all available providers', async () => {
    const { wrapper } = getMountedWrapper()
    wrapper.find(selectors.searchInput).setValue('albert')
    await flushPromises()
    expect(wrapper.findAll(selectors.providerListItem).length).toEqual(2)
  })
  test('only displays provider list item if search results are attached', async () => {
    const { wrapper } = getMountedWrapper()
    providerContacts.previewSearch.search.mockReturnValueOnce({ values: [] })
    wrapper.find(selectors.searchInput).setValue('albert')
    await flushPromises()
    expect(wrapper.findAll(selectors.providerListItem).length).toEqual(1)
  })
  test('displays the provider name in the provider list item', async () => {
    const { wrapper } = getMountedWrapper()
    wrapper.find(selectors.searchInput).setValue('albert')
    await flushPromises()
    const providerDisplayNameItems = wrapper.findAll(selectors.providerDisplayName)
    expect(providerDisplayNameItems.at(0).text()).toEqual('Files')
    expect(providerDisplayNameItems.at(1).text()).toEqual('Contacts')
  })
  test('The search provider only displays the more results link if a listSearch component is present', async () => {
    const { wrapper } = getMountedWrapper()
    wrapper.find(selectors.searchInput).setValue('albert')
    await flushPromises()
    expect(wrapper.findAll(selectors.providerMoreResultsLink).length).toEqual(1)
  })
  test('hides options on key press enter', async () => {
    const { wrapper } = getMountedWrapper()
    wrapper.find(selectors.searchInput).setValue('albert')
    await flushPromises()
    wrapper.find(selectors.searchInput).trigger('keyup.enter')
    expect(ocDropStub.methods.hide).toHaveBeenCalled()
  })
  test('hides options on key press escape', async () => {
    const { wrapper } = getMountedWrapper()
    wrapper.find(selectors.searchInput).setValue('albert')
    await flushPromises()
    wrapper.find(selectors.searchInput).trigger('keyup.esc')
    expect(ocDropStub.methods.hide).toHaveBeenCalled()
  })
  test('hides options if no search term is given', async () => {
    const { wrapper } = getMountedWrapper()
    wrapper.find(selectors.searchInput).setValue('albert')
    await flushPromises()
    wrapper.find(selectors.searchInput).setValue('')
    expect(ocDropStub.methods.hide).toHaveBeenCalled()
  })
  test('sets the search term according to route value on mount', async () => {
    const { wrapper } = getMountedWrapper({ term: 'alice' })
    await flushPromises()
    expect((wrapper.vm as any).term).toBe('alice')
    expect(wrapper.get('input').element.value).toBe('alice')
  })
  test('navigates to files-common-search route on key press enter if search term is given', async () => {
    const { wrapper } = getMountedWrapper()
    wrapper.find(selectors.searchInput).setValue('albert')
    const spyRouterPushStub = wrapper.vm.$router.push
    await flushPromises()
    wrapper.find(selectors.searchInput).trigger('keyup.enter')
    expect(spyRouterPushStub).toHaveBeenCalledTimes(1)
    expect(spyRouterPushStub).toHaveBeenCalledWith({
      name: 'files-common-search',
      query: expect.objectContaining({ term: 'albert', provider: 'files.sdk' })
    })
  })
  test('starts on the first page when navigating to the search results', async () => {
    const { wrapper } = getMountedWrapper({ query: { page: '2' } })
    wrapper.find(selectors.searchInput).setValue('albert')
    await flushPromises()
    wrapper.find(selectors.searchInput).trigger('keyup.enter')
    expect(wrapper.vm.$router.push).toHaveBeenCalledWith({
      name: 'files-common-search',
      query: expect.not.objectContaining({ page: '2' })
    })
  })
  test('does not navigate to the list view if no list provider given', async () => {
    const { wrapper } = getMountedWrapper({ providers: [providerContacts] })
    wrapper.find(selectors.searchInput).setValue('albert')
    const spyRouterPushStub = wrapper.vm.$router.push
    await flushPromises()
    wrapper.find(selectors.searchInput).trigger('keyup.enter')
    expect(spyRouterPushStub).not.toHaveBeenCalled()
  })
  test('executes search if term is empty but route is common search', async () => {
    const { wrapper } = getMountedWrapper({
      route: 'files-common-search',
      query: { scope: 'root-dir' },
      store: { resourcesStore: { currentFolder: { fileId: 'root-dir' } } }
    })
    await wrapper
      .findComponent<typeof SearchBarFilter>(selectors.searchFilters)
      .find(`[data-test-id="${SearchLocationFilterConstants.currentFolder}"]`)
      .trigger('click')

    const spyRouterPushStub = wrapper.vm.$router.push
    expect(spyRouterPushStub).toHaveBeenCalledWith({
      name: 'files-common-search',
      query: expect.objectContaining({
        term: '',
        provider: 'files.sdk',
        useScope: 'true',
        scope: 'root-dir'
      })
    })
  })
  test('keeps searching in the current folder when useScope is given via route', async () => {
    const { wrapper } = getMountedWrapper({
      query: { scope: 'folder-id', useScope: 'true' },
      store: { resourcesStore: { currentFolder: { fileId: 'folder-id' } } }
    })
    wrapper.find(selectors.searchInput).setValue('albert')
    await flushPromises()
    expect(providerFiles.previewSearch.search).toHaveBeenLastCalledWith(
      expect.stringContaining('folder-id')
    )
  })
  describe('search location across views', () => {
    test('discards an in-flight preview from the previous scope', async () => {
      const { wrapper } = getMountedWrapper({
        store: { resourcesStore: { currentFolder: { fileId: 'folder-id' } } }
      })
      await flushPromises()
      let resolveUnscoped: (result: SearchResult) => void
      let resolveScoped: (result: SearchResult) => void
      providerFiles.previewSearch.search
        .mockReturnValueOnce(
          new Promise<SearchResult>((resolve) => {
            resolveUnscoped = resolve
          })
        )
        .mockReturnValueOnce(
          new Promise<SearchResult>((resolve) => {
            resolveScoped = resolve
          })
        )
      await wrapper.find(selectors.searchInput).setValue('albert')
      await flushPromises()
      expect(providerFiles.previewSearch.search).toHaveBeenCalledTimes(1)
      await wrapper
        .find(`[data-test-id="${SearchLocationFilterConstants.currentFolder}"]`)
        .trigger('click')
      await flushPromises()
      expect(providerFiles.previewSearch.search).toHaveBeenCalledTimes(2)

      resolveUnscoped({
        totalResults: 1,
        values: [{ id: 'old-scope', data: { id: 'old-scope', name: 'albert' } }]
      })
      await flushPromises()
      resolveScoped({
        totalResults: 1,
        values: [{ id: 'current-folder', data: { id: 'current-folder', name: 'albert' } }]
      })
      await flushPromises()
      expect(wrapper.find('[data-search-id="old-scope"]').exists()).toBe(false)
      expect(wrapper.find('[data-search-id="current-folder"]').exists()).toBe(true)
    })
    test('uses the URL scope on the results page even if the previous folder is still in the store', async () => {
      const { wrapper, mocks } = getMountedWrapper({
        route: 'files-common-search',
        query: { scope: 'linked-folder', useScope: 'true' },
        store: { resourcesStore: { currentFolder: { fileId: 'previous-folder' } } }
      })
      await flushPromises()
      await wrapper.find(selectors.searchInput).setValue('albert')
      await flushPromises()
      expect(providerFiles.previewSearch.search).toHaveBeenLastCalledWith(
        'name:"*albert*" AND scope:linked-folder'
      )
      await wrapper.find(selectors.searchInput).trigger('keyup.enter')
      expect(mocks.$router.push).toHaveBeenLastCalledWith({
        name: 'files-common-search',
        query: expect.objectContaining({ scope: 'linked-folder', useScope: 'true' })
      })
    })

    test('restores an explicit folder selection after visiting Favorites', async () => {
      const { wrapper, currentRoute, mocks, resourcesStore } = getMountedWrapper({
        store: { resourcesStore: { currentFolder: { fileId: 'first-folder' } } }
      })
      await flushPromises()
      await wrapper.find(selectors.searchInput).setValue('albert')
      await wrapper
        .find(`[data-test-id="${SearchLocationFilterConstants.currentFolder}"]`)
        .trigger('click')
      await flushPromises()
      expect(providerFiles.previewSearch.search).toHaveBeenLastCalledWith(
        'name:"*albert*" AND scope:first-folder'
      )

      currentRoute.value = {
        ...currentRoute.value,
        name: 'files-common-favorites',
        path: '/favorites',
        query: {}
      }
      await flushPromises()
      expect(wrapper.findComponent(OcFilterChip).props('selectedItemNames')).toEqual(['All files'])
      expect(providerFiles.previewSearch.search).toHaveBeenLastCalledWith('name:"*albert*"')
      expect(mocks.$router.push).not.toHaveBeenCalled()

      currentRoute.value = {
        ...currentRoute.value,
        name: 'files-spaces-generic',
        path: '/spaces/second-folder',
        query: {}
      }
      resourcesStore.currentFolder = { fileId: 'second-folder' } as Resource
      await flushPromises()
      expect(wrapper.findComponent(OcFilterChip).props('selectedItemNames')).toEqual([
        'Current folder'
      ])
      expect(providerFiles.previewSearch.search).toHaveBeenLastCalledWith(
        'name:"*albert*" AND scope:second-folder'
      )
    })

    test.each([
      'files-common-favorites',
      'files-spaces-projects',
      'files-shares-with-me',
      'files-shares-with-others',
      'files-trash-generic'
    ])(
      'keeps the filter and search unscoped after visiting %s following a reload',
      async (route) => {
        const { wrapper, currentRoute, mocks, resourcesStore } = getMountedWrapper({
          route: 'files-common-search',
          query: { scope: 'folder-id', useScope: 'true' }
        })
        await flushPromises()
        expect(mocks.$router.push).not.toHaveBeenCalled()

        currentRoute.value = {
          ...currentRoute.value,
          name: route,
          path: `/${route}`,
          query: {}
        }
        await flushPromises()
        expect(wrapper.findComponent(OcFilterChip).props('selectedItemNames')).toEqual([
          'All files'
        ])
        currentRoute.value = {
          ...currentRoute.value,
          name: 'files-spaces-generic',
          path: '/spaces/folder-id',
          query: {}
        }
        resourcesStore.currentFolder = { fileId: 'folder-id' } as Resource
        await flushPromises()

        expect(wrapper.findComponent(OcFilterChip).props('selectedItemNames')).toEqual([
          'All files'
        ])
        await wrapper.find(selectors.searchInput).setValue('albert')
        await flushPromises()
        expect(providerFiles.previewSearch.search).toHaveBeenLastCalledWith('name:"*albert*"')
        await wrapper.find(selectors.searchInput).trigger('keyup.enter')
        expect(mocks.$router.push).toHaveBeenLastCalledWith({
          name: 'files-common-search',
          query: expect.objectContaining({ useScope: 'false' })
        })
      }
    )

    test('searches all files when entering a vault from scoped search results', async () => {
      const { wrapper, currentRoute, mocks, resourcesStore } = getMountedWrapper({
        route: 'files-common-search',
        query: { scope: 'folder-id', useScope: 'true' }
      })
      await flushPromises()
      currentRoute.value = {
        ...currentRoute.value,
        name: 'files-spaces-generic',
        path: '/spaces/test.vault',
        query: {}
      }
      resourcesStore.currentFolder = { fileId: 'vault-id', isInVault: true } as Resource
      await flushPromises()

      expect(wrapper.findComponent(OcFilterChip).props('selectedItemNames')).toEqual(['All files'])
      await wrapper.find(selectors.searchInput).setValue('albert')
      await flushPromises()
      expect(providerFiles.previewSearch.search).toHaveBeenLastCalledWith('name:"*albert*"')
      await wrapper.find(selectors.searchInput).trigger('keyup.enter')
      expect(mocks.$router.push).toHaveBeenLastCalledWith({
        name: 'files-common-search',
        query: expect.objectContaining({ useScope: 'false' })
      })
    })

    test('follows search scope query changes without navigating automatically', async () => {
      const { wrapper, currentRoute, mocks } = getMountedWrapper({
        route: 'files-common-search',
        query: { scope: 'folder-id', useScope: 'false' }
      })
      await flushPromises()
      currentRoute.value = {
        ...currentRoute.value,
        query: { scope: 'folder-id', useScope: 'true' }
      }
      await flushPromises()
      expect(wrapper.findComponent(OcFilterChip).props('selectedItemNames')).toEqual([
        'Current folder'
      ])
      await wrapper.find(selectors.searchInput).setValue('albert')
      await flushPromises()
      expect(providerFiles.previewSearch.search).toHaveBeenLastCalledWith(
        'name:"*albert*" AND scope:folder-id'
      )
      expect(mocks.$router.push).not.toHaveBeenCalled()

      currentRoute.value = {
        ...currentRoute.value,
        query: { scope: 'folder-id', useScope: 'false' }
      }
      await flushPromises()
      expect(wrapper.findComponent(OcFilterChip).props('selectedItemNames')).toEqual(['All files'])
      await wrapper.find(selectors.searchInput).trigger('click')
      await flushPromises()
      expect(providerFiles.previewSearch.search).toHaveBeenLastCalledWith('name:"*albert*"')
      await wrapper.find(selectors.searchInput).setValue('marie')
      await flushPromises()
      expect(providerFiles.previewSearch.search).toHaveBeenLastCalledWith('name:"*marie*"')
      expect(mocks.$router.push).not.toHaveBeenCalled()
    })

    test('cancels a pending preview search when navigating to the results with Enter', async () => {
      // a pending preview search would cancel the results search it shares its task with (endless spinner)
      const { wrapper, mocks } = getMountedWrapper({
        store: { resourcesStore: { currentFolder: { fileId: 'folder-id' } } }
      })
      const debouncedSearch = vi.mocked(debounce).mock.results.at(-1).value
      await flushPromises()
      await wrapper.find(selectors.searchInput).setValue('albert')
      await wrapper
        .find(`[data-test-id="${SearchLocationFilterConstants.currentFolder}"]`)
        .trigger('click')
      await wrapper.find(selectors.searchInput).trigger('keyup.enter')

      expect(mocks.$router.push).toHaveBeenLastCalledWith({
        name: 'files-common-search',
        query: expect.objectContaining({ term: 'albert', useScope: 'true' })
      })
      expect(debouncedSearch.cancel).toHaveBeenCalled()
    })
    test('does not start a preview search when the location filter changes on the results page', async () => {
      // a preview search would cancel the results search it shares its task with (endless spinner)
      const { wrapper, mocks } = getMountedWrapper({
        route: 'files-common-search',
        term: 'albert',
        query: { scope: 'folder-id', useScope: 'true' },
        store: { resourcesStore: { currentFolder: { fileId: 'folder-id' } } }
      })
      await flushPromises()
      providerFiles.previewSearch.search.mockClear()

      await wrapper
        .find(`[data-test-id="${SearchLocationFilterConstants.allFiles}"]`)
        .trigger('click')
      await flushPromises()

      expect(mocks.$router.push).toHaveBeenLastCalledWith({
        name: 'files-common-search',
        query: expect.objectContaining({ term: 'albert', useScope: 'false' })
      })
      expect(providerFiles.previewSearch.search).not.toHaveBeenCalled()
    })
    test('does not start a preview search when only the scope query changes on the results page', async () => {
      const { currentRoute } = getMountedWrapper({
        route: 'files-common-search',
        term: 'albert',
        query: { scope: 'folder-id', useScope: 'true' }
      })
      await flushPromises()
      providerFiles.previewSearch.search.mockClear()

      currentRoute.value = {
        ...currentRoute.value,
        query: { term: 'albert', scope: 'folder-id', useScope: 'false' }
      }
      await flushPromises()

      expect(providerFiles.previewSearch.search).not.toHaveBeenCalled()
    })
    test('uses the new scope for preview and result links when the scope changes with the same term', async () => {
      const { wrapper, currentRoute } = getMountedWrapper({
        route: 'files-common-search',
        query: { scope: 'first-folder', useScope: 'true' }
      })
      await flushPromises()
      await wrapper.find(selectors.searchInput).setValue('albert')
      await flushPromises()
      currentRoute.value = {
        ...currentRoute.value,
        query: { term: 'albert', scope: 'second-folder', useScope: 'true' }
      }
      await flushPromises()
      await wrapper.find(selectors.searchInput).trigger('click')
      await flushPromises()
      expect(providerFiles.previewSearch.search).toHaveBeenLastCalledWith(
        'name:"*albert*" AND scope:second-folder'
      )
      expect(wrapper.findComponent(RouterLinkStub).props('to')).toMatchObject({
        query: { term: 'albert', scope: 'second-folder', useScope: 'true' }
      })
    })
  })
  test('does not execute search if term is empty and route is not common search', async () => {
    const { wrapper } = getMountedWrapper()
    await wrapper
      .findComponent<typeof SearchBarFilter>(selectors.searchFilters)
      .find(`[data-test-id="${SearchLocationFilterConstants.currentFolder}"]`)
      .trigger('click')

    const spyRouterPushStub = wrapper.vm.$router.push
    expect(spyRouterPushStub).not.toHaveBeenCalled()
  })
  test('focuses search input when pressing "s"', () => {
    const { wrapper } = getMountedWrapper()
    const nonEditableTarget = document.createElement('div')
    document.body.appendChild(nonEditableTarget)
    nonEditableTarget.focus()

    ;(wrapper.vm as any).onSearchShortcut()
    nonEditableTarget.remove()
  })
  test('focuses search input when pressing "/"', () => {
    const { wrapper } = getMountedWrapper()
    const nonEditableTarget = document.createElement('button')
    document.body.appendChild(nonEditableTarget)
    nonEditableTarget.focus()

    ;(wrapper.vm as any).onSearchShortcut()
    nonEditableTarget.remove()
  })
  test('does not focus search input when editable element is already focused', () => {
    const { wrapper } = getMountedWrapper()
    const textInput = document.createElement('input')
    document.body.appendChild(textInput)
    textInput.focus()

    ;(wrapper.vm as any).onSearchShortcut()
    textInput.remove()
  })
  test('clears search term on key press esc while input has focus', async () => {
    const { wrapper } = getMountedWrapper()
    wrapper.find(selectors.searchInput).setValue('albert')
    await flushPromises()
    wrapper.find(selectors.searchInput).trigger('keyup.esc')
    expect((wrapper.vm as any).term).toBe('')
  })
  test('clears search term and hides options on app.search.term.clear event', async () => {
    const { wrapper } = getMountedWrapper()
    wrapper.find(selectors.searchInput).setValue('albert')
    await flushPromises()
    eventBus.publish('app.search.term.clear')
    await nextTick()
    expect((wrapper.vm as any).term).toBe('')
    expect(ocDropStub.methods.hide).toHaveBeenCalled()
  })
})

function getMountedWrapper({
  mocks = {},
  userContextReady = true,
  providers = [providerFiles, providerContacts],
  route = 'files-spaces-generic',
  store = {},
  term = '',
  query = {} as Record<string, string>
} = {}) {
  vi.mocked(useAvailableProviders).mockReturnValue(ref(providers))

  const currentRoute = shallowRef<RouteLocationNormalizedLoaded>({
    ...mock<RouteLocationNormalizedLoaded>(),
    name: route,
    path: `/${route}`,
    query: {
      term,
      provider: '',
      ...query
    }
  })
  const componentMocks = defaultComponentMocks({ currentRoute: currentRoute.value })
  writable(componentMocks.$router as Router).currentRoute = currentRoute
  const localMocks = {
    ...componentMocks,
    ...mocks
  }

  const wrapper = mount(SearchBar, {
    global: {
      plugins: [
        ...defaultPlugins({
          piniaOptions: { authState: { userContextReady: userContextReady }, ...store }
        })
      ],
      mocks: localMocks,
      renderStubDefaultSlot: true,
      provide: { ...localMocks },
      stubs: {
        'router-link': RouterLinkStub,
        OcDrop: ocDropStub
      }
    }
  })
  return {
    currentRoute,
    mocks: localMocks,
    resourcesStore: useResourcesStore(),
    wrapper
  }
}
