import ItemFilterToggle from '../../../src/components/ItemFilterToggle.vue'
import { defaultComponentMocks, defaultPlugins, mount } from '@opencloud-eu/web-test-helpers'
import { queryItemAsString } from '../../../src/composables/appDefaults'
import { nextTick, reactive } from 'vue'

vi.mock('../../../src/composables/appDefaults', () => ({
  appDefaults: vi.fn(),
  queryItemAsString: vi.fn()
}))

const selectors = {
  labelSpan: '.oc-filter-chip-label',
  filterBtn: '.oc-filter-chip-button'
}

describe('ItemFilterToggle', () => {
  it('renders the toggle filter including its label', () => {
    const filterLabel = 'Toggle'
    const { wrapper } = getWrapper({ props: { filterLabel } })
    expect(wrapper.find(selectors.labelSpan).text()).toEqual(filterLabel)
  })
  it('emits the "toggleFilter"-event on click', async () => {
    const { wrapper } = getWrapper()
    await wrapper.find(selectors.filterBtn).trigger('click')
    expect(wrapper.emitted('toggleFilter').length).toBeGreaterThan(0)
  })
  describe('route query', () => {
    it('sets the active state as query param', async () => {
      const { wrapper, mocks } = getWrapper()
      expect(mocks.$router.push).not.toHaveBeenCalled()
      await wrapper.find(selectors.filterBtn).trigger('click')
      expect(mocks.$router.push).toHaveBeenCalledWith(
        expect.objectContaining({
          query: expect.objectContaining({ [(wrapper.vm as any).queryParam]: 'true' })
        })
      )
    })
    it('sets the active state initially when given via query param', () => {
      const { wrapper } = getWrapper({ initialQuery: 'true' })
      expect((wrapper.vm as any).filterActive).toEqual(true)
    })
    it('resets the active state when the query param is removed from the route', async () => {
      const currentRoute = reactive({ query: { q_toggle: 'true' } as Record<string, string> })
      const { wrapper } = getWrapper({ currentRoute })
      expect((wrapper.vm as any).filterActive).toEqual(true)
      delete currentRoute.query.q_toggle
      await nextTick()
      expect((wrapper.vm as any).filterActive).toEqual(false)
    })
  })
})

function getWrapper({
  props = {},
  initialQuery = '',
  currentRoute = undefined
}: {
  props?: object
  initialQuery?: string
  currentRoute?: { query: Record<string, string> }
} = {}) {
  vi.mocked(queryItemAsString).mockImplementation((value) =>
    currentRoute ? (value as string) : initialQuery
  )
  const mocks = defaultComponentMocks({ currentRoute: currentRoute as any })
  return {
    mocks,
    wrapper: mount(ItemFilterToggle, {
      props: {
        filterLabel: 'Toggle',
        filterName: 'toggle',
        ...props
      },
      global: {
        plugins: [...defaultPlugins()],
        mocks,
        provide: mocks
      }
    })
  }
}
