import ItemFilterInline from '../../../../src/components/Filters/ItemFilterInline.vue'
import { InlineFilterOption } from '../../../../src/components/Filters/types'
import {
  defaultComponentMocks,
  defaultPlugins,
  mount,
  PartialComponentProps
} from '@opencloud-eu/web-test-helpers'
import { queryItemAsString } from '../../../../src/composables/appDefaults'
import { mock } from 'vitest-mock-extended'
import { nextTick, reactive } from 'vue'

vi.mock('../../../../src/composables/appDefaults', () => ({
  appDefaults: vi.fn(),
  queryItemAsString: vi.fn()
}))

const selectors = {
  filterOption: '.item-inline-filter-option',
  filterOptionLabel: '.item-inline-filter-option-label',
  selectedOptionLabel: '.item-inline-filter-option-selected .item-inline-filter-option-label'
}

describe('ItemFilterInline', () => {
  const filterOptions = [
    mock<InlineFilterOption>({ name: 'filter1', label: 'filter1' }),
    mock<InlineFilterOption>({ name: 'filter2', label: 'filter2' })
  ]

  it('renders all given options', () => {
    const { wrapper } = getWrapper({ props: { filterOptions } })
    expect(wrapper.findAll(selectors.filterOption).length).toBe(filterOptions.length)
    expect(wrapper.findAll(selectors.filterOption).at(0).text()).toEqual(filterOptions[0].label)
    expect(wrapper.findAll(selectors.filterOption).at(1).text()).toEqual(filterOptions[1].label)
  })
  it('emits the "toggleFilter"-event on click on an option', async () => {
    const { wrapper } = getWrapper({ props: { filterOptions } })
    await wrapper.find(selectors.filterOption).trigger('click')
    expect(wrapper.emitted('toggleFilter').length).toBeGreaterThan(0)
  })
  describe('route query', () => {
    it('sets the active option as query param', async () => {
      const { wrapper, mocks } = getWrapper({ props: { filterOptions } })
      expect(mocks.$router.push).not.toHaveBeenCalled()
      await wrapper.find(selectors.filterOption).trigger('click')
      expect(mocks.$router.push).toHaveBeenCalledWith(
        expect.objectContaining({
          query: expect.objectContaining({ [(wrapper.vm as any).queryParam]: 'filter1' })
        })
      )
    })
    it('sets the active optin initially when given via query param', async () => {
      const initialQuery = filterOptions[1].name
      const { wrapper } = getWrapper({ initialQuery, props: { filterOptions } })
      await wrapper.vm.$nextTick()
      expect(wrapper.find(selectors.selectedOptionLabel).text()).toEqual(initialQuery)
    })
    it('resets the active option when the query param is removed from the route', async () => {
      const currentRoute = reactive({
        query: { q_InlineFilter: filterOptions[1].name } as Record<string, string>
      })
      const { wrapper } = getWrapper({ currentRoute, props: { filterOptions } })
      await nextTick()
      expect(wrapper.find(selectors.selectedOptionLabel).text()).toEqual(filterOptions[1].label)
      delete currentRoute.query.q_InlineFilter
      await nextTick()
      expect(wrapper.find(selectors.selectedOptionLabel).text()).toEqual(filterOptions[0].label)
      expect(wrapper.emitted('toggleFilter')).toEqual([[filterOptions[1]], [filterOptions[0]]])
    })
  })
})

function getWrapper({
  props = {},
  initialQuery = '',
  currentRoute = undefined
}: {
  props?: PartialComponentProps<typeof ItemFilterInline>
  initialQuery?: string
  currentRoute?: { query: Record<string, string> }
} = {}) {
  vi.mocked(queryItemAsString).mockImplementation((value) =>
    currentRoute ? (value as string) : initialQuery
  )
  const mocks = defaultComponentMocks({ currentRoute: currentRoute as any })
  return {
    mocks,
    wrapper: mount(ItemFilterInline, {
      props: {
        filterName: 'InlineFilter',
        filterOptions: [],
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
