import { nextTick } from 'vue'
import { OcDrop, OcTextInput } from '@opencloud-eu/design-system/components'
import {
  defaultComponentMocks,
  defaultPlugins,
  ocDropStub,
  RouteLocation,
  shallowMount
} from '@opencloud-eu/web-test-helpers'
import { mock } from 'vitest-mock-extended'
import ShortcutTargetInput from '../../../src/components/ShortcutTargetInput.vue'
import ResourcePreview from '../../../src/components/Search/ResourcePreview.vue'
import { SearchResult, SearchResultValue } from '../../../src/components/Search/types'

const { search } = vi.hoisted(() => ({ search: vi.fn() }))
vi.mock('../../../src/composables/search', () => ({ useSearch: () => ({ search }) }))

describe('ShortcutTargetInput', () => {
  let wrapper: ReturnType<typeof getWrapper>['wrapper']

  beforeEach(() => {
    vi.useFakeTimers()
    search.mockResolvedValue({ values: [], totalResults: 0 })
  })

  afterEach(() => {
    wrapper?.unmount()
    vi.useRealTimers()
  })

  function setup(options: Parameters<typeof getWrapper>[0] = {}) {
    const result = getWrapper(options)
    wrapper = result.wrapper
    return result
  }

  it.each(['javascript:alert(1)', 'ftp://example.org', 'data:text/html,<b>x</b>'])(
    'shows an error for the unsafe URL "%s"',
    async (url) => {
      const { input, textInput } = setup()
      await input(url)
      expect(textInput.props('errorMessage')).toBe('Please enter a valid http or https URL')
    }
  )

  it.each(['', 'example.org', 'localhost:8080/foo', 'http://example.org'])(
    'does not show an error for "%s"',
    async (url) => {
      const { input, textInput } = setup()
      await input(url)
      expect(textInput.props('errorMessage')).toBe('')
    }
  )

  it('debounces file search, excludes shortcuts and limits the results', async () => {
    const { input } = setup()
    await input('rep')
    await vi.advanceTimersByTimeAsync(100)
    await input('report')
    await vi.advanceTimersByTimeAsync(199)
    expect(search).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    expect(search).toHaveBeenCalledExactlyOnceWith('name:"*report*" NOT name:"*.url"', 7)
  })

  it('does not search in a public link', async () => {
    const { input, drop } = setup({ route: 'files-public-link' })
    await input('report')
    await vi.advanceTimersByTimeAsync(200)
    expect(search).not.toHaveBeenCalled()
    expect(drop.vm.show).not.toHaveBeenCalled()
  })

  it('does not offer a URL suggestion or open an empty dropdown for a typed URL', async () => {
    const { input, drop, keydown } = setup()
    await input('https://example.org')
    await vi.advanceTimersByTimeAsync(200)
    expect(wrapper.find('.selectable-item').exists()).toBe(false)
    expect(drop.vm.show).not.toHaveBeenCalled()
    expect((await keydown('Enter')).defaultPrevented).toBe(false)
    expect(wrapper.emitted('select')).toBeUndefined()
  })

  it('cancels a pending search when the input is cleared', async () => {
    const { input, drop } = setup()
    await input('report')
    await input(' ')
    await vi.advanceTimersByTimeAsync(200)
    expect(search).not.toHaveBeenCalled()
    expect(drop.vm.hide).toHaveBeenCalled()
  })

  it('opens the dropdown only after file matches arrive', async () => {
    let resolveSearch: (result: SearchResult) => void
    search.mockReturnValueOnce(new Promise<SearchResult>((resolve) => (resolveSearch = resolve)))
    const { input, drop } = setup()
    await input('report')
    await vi.advanceTimersByTimeAsync(200)
    expect(drop.vm.show).not.toHaveBeenCalled()
    resolveSearch({ values: [result('report.pdf')], totalResults: 1 })
    await vi.advanceTimersByTimeAsync(0)
    expect(drop.vm.show).toHaveBeenCalledExactlyOnceWith({ noFocus: true })
    expect(wrapper.findAll('.selectable-item')).toHaveLength(1)
  })

  it('cancels a pending search on unmount', async () => {
    const { input } = setup()
    await input('report')
    wrapper.unmount()
    await vi.advanceTimersByTimeAsync(200)
    expect(search).not.toHaveBeenCalled()
  })

  it.each(['clear', 'replace'])('ignores an in-flight search after %s', async (action) => {
    let resolveSearch: (result: SearchResult) => void
    search.mockReturnValueOnce(new Promise<SearchResult>((resolve) => (resolveSearch = resolve)))
    const { input, drop } = setup()
    await input('report')
    await vi.advanceTimersByTimeAsync(200)
    await input(action === 'clear' ? '' : 'different')
    resolveSearch({ values: [result('report.pdf')], totalResults: 1 })
    await vi.advanceTimersByTimeAsync(0)
    expect(wrapper.findComponent(ResourcePreview).exists()).toBe(false)
    expect(drop.vm.show).not.toHaveBeenCalled()
  })

  it('leaves a valid URL usable without opening the dropdown when search fails', async () => {
    search.mockRejectedValueOnce(new Error('Search unavailable'))
    const { input, drop, textInput } = setup()
    await input('example.org')
    await vi.advanceTimersByTimeAsync(200)
    expect(textInput.props('modelValue')).toBe('example.org')
    expect(textInput.props('errorMessage')).toBe('')
    expect(drop.vm.show).not.toHaveBeenCalled()
  })

  it('selects a file with an internal URL and its original name', async () => {
    search.mockResolvedValueOnce({ values: [result('report.pdf')], totalResults: 1 })
    const { input, drop } = setup()
    await input('report')
    await vi.advanceTimersByTimeAsync(200)
    await wrapper.get('.selectable-item oc-button-stub').trigger('click')
    expect(wrapper.emitted('select')).toEqual([
      [`${window.location.origin}/f/report.pdf-id`, 'report.pdf']
    ])
    expect(drop.vm.hide).toHaveBeenCalled()
    expect(wrapper.findComponent(ResourcePreview).exists()).toBe(false)
  })

  it('navigates suggestions with arrows, skips disabled entries and selects with Enter', async () => {
    search.mockResolvedValueOnce({
      values: [result('disabled', true), result('report.pdf')],
      totalResults: 2
    })
    const { input, keydown } = setup()
    await input('report')
    await vi.advanceTimersByTimeAsync(200)
    expect(wrapper.find('.selectable-item.active').exists()).toBe(false)
    await keydown('ArrowDown')
    expect(wrapper.findAll('.selectable-item')[1].classes()).toContain('active')
    await keydown('ArrowDown')
    expect(wrapper.find('.selectable-item.active').exists()).toBe(false)
    await keydown('Enter')
    expect(wrapper.emitted('select')).toBeUndefined()
    await keydown('ArrowUp')
    await keydown('Enter')
    expect(wrapper.emitted('select')).toEqual([
      [`${window.location.origin}/f/report.pdf-id`, 'report.pdf']
    ])
  })

  it('does not select a disabled suggestion with the mouse', async () => {
    search.mockResolvedValueOnce({ values: [result('disabled', true)], totalResults: 1 })
    const { input } = setup()
    await input('disabled')
    await vi.advanceTimersByTimeAsync(200)
    const button = wrapper.get('.selectable-item oc-button-stub')
    expect(button.attributes('disabled')).toBeDefined()
    await button.trigger('click')
    expect(wrapper.emitted('select')).toBeUndefined()
  })

  it('consumes Enter only while the suggestions are open and not during composition', async () => {
    search.mockResolvedValueOnce({ values: [result('report.pdf')], totalResults: 1 })
    const { input, keydown } = setup()
    expect((await keydown('Enter')).defaultPrevented).toBe(false)
    await input('report')
    await vi.advanceTimersByTimeAsync(200)
    await keydown('ArrowDown')
    expect((await keydown('Enter', true)).defaultPrevented).toBe(false)
    expect(wrapper.emitted('select')).toBeUndefined()
    expect((await keydown('Enter')).defaultPrevented).toBe(true)
    expect(wrapper.emitted('select')).toEqual([
      [`${window.location.origin}/f/report.pdf-id`, 'report.pdf']
    ])
  })

  it('closes suggestions with Escape before allowing the modal to handle another Escape', async () => {
    search.mockResolvedValueOnce({ values: [result('report.pdf')], totalResults: 1 })
    const { input, keydown, drop } = setup()
    await input('report')
    await vi.advanceTimersByTimeAsync(200)
    const event = await keydown('Escape')
    expect(event.stopPropagation).toHaveBeenCalled()
    expect(drop.vm.hide).toHaveBeenCalled()
    const nextEvent = await keydown('Escape')
    expect(nextEvent.stopPropagation).not.toHaveBeenCalled()
  })

  it('hides previous matches when another search returns no files', async () => {
    search.mockResolvedValueOnce({ values: [result('report.pdf')], totalResults: 1 })
    const { input, drop } = setup()
    await input('report')
    await vi.advanceTimersByTimeAsync(200)
    expect(drop.vm.show).toHaveBeenCalledTimes(1)
    await input('https://example.org')
    await vi.advanceTimersByTimeAsync(200)
    expect(drop.vm.hide).toHaveBeenCalled()
    expect(drop.vm.show).toHaveBeenCalledTimes(1)
    expect(wrapper.findComponent(ResourcePreview).exists()).toBe(false)
  })
})

function result(name: string, disabled = false): SearchResultValue {
  const data = { id: `${name}-id`, name, disabled }
  return { id: data.id, data }
}

function getWrapper({ route = 'files-spaces-generic' } = {}) {
  const mocks = defaultComponentMocks({ currentRoute: mock<RouteLocation>({ name: route }) })
  const wrapper = shallowMount(ShortcutTargetInput, {
    props: { modelValue: '' },
    global: {
      plugins: defaultPlugins(),
      mocks,
      provide: mocks,
      stubs: { OcDrop: ocDropStub },
      renderStubDefaultSlot: true
    }
  })
  const textInput = wrapper.getComponent(OcTextInput)
  const drop = wrapper.getComponent(OcDrop)
  vi.spyOn(drop.vm, 'show').mockImplementation(() => Promise.resolve(drop.vm.$emit('showDrop')))
  vi.spyOn(drop.vm, 'hide').mockImplementation(() => drop.vm.$emit('hideDrop'))

  async function input(value: string) {
    textInput.vm.$emit('update:modelValue', value)
    await wrapper.setProps({ modelValue: value })
  }

  async function keydown(key: string, isComposing = false) {
    const event = new KeyboardEvent('keydown', { key, isComposing, cancelable: true })
    vi.spyOn(event, 'stopPropagation')
    textInput.vm.$emit('keydown', event)
    await nextTick()
    return event
  }

  return { wrapper, textInput, drop, input, keydown }
}
