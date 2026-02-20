import SearchBar from '../../../src/portals/SearchBar.vue'
import { flushPromises } from '@vue/test-utils'
import { mock } from 'vitest-mock-extended'
import { markRaw, nextTick, ref } from 'vue'
import { defineComponent } from 'vue'
import {
  defaultPlugins,
  mount,
  defaultComponentMocks,
  RouteLocation,
  ocDropStub
} from '@opencloud-eu/web-test-helpers'
import { useAvailableProviders } from '../../../src/composables'
import { SearchBarFilter, SearchLocationFilterConstants } from '@opencloud-eu/web-pkg'

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
  optionsHidden: '.tippy-box[data-state="hidden"]',
  optionsVisible: '.tippy-box[data-state="visible"]',
  searchFilters: '#files-global-search-filter'
}

vi.mock('lodash-es', () => ({ debounce: (fn: unknown) => fn, kebabCase: (fn: unknown) => fn }))
vi.mock('../../../src/composables/useAvailableProviders')
vi.mock('@opencloud-eu/web-pkg', async (importOriginal) => ({
  ...(await importOriginal<any>()),
  useIsAppActive: () => false
}))

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
  vi.spyOn(console, 'warn').mockImplementation(undefined)
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
    expect(wrapper.vm.term).toBe('alice')
  })
  test('shows message if no results are available', async () => {
    const { wrapper } = getMountedWrapper()
    providerFiles.previewSearch.search.mockReturnValueOnce({ values: [] })
    providerContacts.previewSearch.search.mockReturnValueOnce({ values: [] })
    wrapper.find(selectors.searchInput).setValue('nothing found')
    await flushPromises()
    expect(wrapper.find(selectors.noResults)).toBeTruthy()
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
    const { wrapper } = getMountedWrapper({ mocks: { $route: { query: { term: 'alice' } } } })
    await nextTick()
    expect(wrapper.vm.term).toBe('alice')
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
  test('does not navigate to the list view if no list provider given', async () => {
    const { wrapper } = getMountedWrapper({ providers: [providerContacts] })
    wrapper.find(selectors.searchInput).setValue('albert')
    const spyRouterPushStub = wrapper.vm.$router.push
    await flushPromises()
    wrapper.find(selectors.searchInput).trigger('keyup.enter')
    expect(spyRouterPushStub).not.toHaveBeenCalled()
  })
  test('executes search if term is empty but route is common search', () => {
    const { wrapper } = getMountedWrapper({
      route: 'files-common-search',
      store: { resourcesStore: { currentFolder: { fileId: 'root-dir' } } }
    })
    wrapper
      .findComponent<typeof SearchBarFilter>(selectors.searchFilters)
      .vm.$emit('update:model-value', {
        value: { id: SearchLocationFilterConstants.currentFolder }
      })

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
  test('does not execute search if term is empty and route is not common search', () => {
    const { wrapper } = getMountedWrapper()
    wrapper
      .findComponent<typeof SearchBarFilter>(selectors.searchFilters)
      .vm.$emit('update:model-value', {
        value: { id: SearchLocationFilterConstants.currentFolder }
      })

    const spyRouterPushStub = wrapper.vm.$router.push
    expect(spyRouterPushStub).not.toHaveBeenCalled()
  })
})

function getMountedWrapper({
  mocks = {},
  userContextReady = true,
  providers = [providerFiles, providerContacts],
  route = 'files-spaces-generic',
  store = {}
} = {}) {
  vi.mocked(useAvailableProviders).mockReturnValue(ref(providers))

  const currentRoute = mock<RouteLocation>({
    name: route,
    query: {
      term: '',
      provider: ''
    }
  })
  const localMocks = {
    ...defaultComponentMocks({ currentRoute }),
    ...mocks
  }

  return {
    wrapper: mount(SearchBar, {
      global: {
        plugins: [
          ...defaultPlugins({
            piniaOptions: { authState: { userContextReady: userContextReady }, ...store }
          })
        ],
        mocks: localMocks,
        renderStubDefaultSlot: true,
        provide: { ...localMocks, isMobileWidth: ref(false) },
        stubs: {
          'router-link': true,
          OcDrop: ocDropStub
        }
      }
    })
  }
}
