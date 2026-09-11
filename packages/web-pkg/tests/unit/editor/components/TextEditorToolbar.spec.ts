import { mount } from '@vue/test-utils'
import { computed, defineComponent, ref } from 'vue'
import { vi } from 'vitest'
import TextEditorToolbar from '../../../../src/editor/components/TextEditorToolbar.vue'
import type { TextEditorInstance } from '../../../../src/editor/types'
import type { EditorAction } from '../../../../src/editor/composables'
import type { YjsCollaborator } from '../../../../src/composables/yjs'

vi.mock('vue3-gettext', () => ({
  useGettext: () => ({ $gettext: (value: string) => value })
}))

function mountToolbar(
  sourceMode = false,
  contentType: 'markdown' | 'html' = 'markdown',
  includeSearchAction = false,
  collaborationStatus: 'connecting' | 'connected' | 'disconnected' | 'local' | null = null,
  collaborators: YjsCollaborator[] = []
) {
  const showSpy = vi.fn()
  const collaborationStatusRef = ref(collaborationStatus)
  const collaboratorsRef = ref(collaborators)

  const actions: EditorAction[] = [
    {
      id: 'source-mode',
      title: 'Show source',
      icon: 'code-s-slash',
      toolbarAction: vi.fn()
    },
    {
      id: 'bold',
      title: 'Bold',
      icon: 'bold',
      toolbarAction: vi.fn()
    }
  ]

  if (includeSearchAction) {
    actions.push({
      id: 'menu-search-and-replace',
      title: 'Search and replace',
      icon: 'seo',
      menuComponent: defineComponent({ template: '<div>search</div>' })
    })
  }

  const isFocusedRef = ref(true)
  const textEditor = {
    editor: ref({}),
    contentType: ref<'markdown' | 'html'>(contentType),
    readonly: ref(false),
    yjsStatus: collaborationStatusRef,
    collaborators: collaboratorsRef,
    state: { sourceMode: ref(sourceMode), editorZoom: ref(100) },
    isFocused: computed(() => isFocusedRef.value),
    actionGroups: () => [
      {
        id: 'view-options',
        title: 'View options',
        actions
      }
    ],
    getContent: vi.fn(() => ''),
    isEmpty: ref(false),
    focus: vi.fn(),
    blur: vi.fn(),
    destroy: vi.fn()
  } as unknown as TextEditorInstance

  const wrapper = mount(TextEditorToolbar, {
    attachTo: document.body,
    global: {
      provide: { textEditor },
      directives: { 'oc-tooltip': () => {}, ocTooltip: () => {} },
      stubs: {
        'oc-drop': defineComponent({
          setup(_, { expose }) {
            expose({ show: showSpy, hide: vi.fn() })
            return {}
          },
          template: '<div><slot /></div>'
        }),
        'oc-button': defineComponent({
          inheritAttrs: false,
          template: '<button v-bind="$attrs"><slot /></button>'
        }),
        'oc-icon': true,
        'text-editor-collaborators': defineComponent({
          props: { users: { type: Array, required: true } },
          template: '<div class="collaborators-stub" :data-count="users.length" />'
        })
      }
    }
  })

  return { wrapper, textEditor, isFocusedRef, showSpy, collaborationStatusRef, collaboratorsRef }
}

/**
 * jsdom has no layout, so widths are faked: every measured action reports `itemWidth`, the toolbar
 * row reports `containerWidth`.
 */
function mockWidths(itemWidth: number, containerWidth: number) {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
    this: HTMLElement
  ) {
    const width = this.dataset?.itemId ? itemWidth : 0
    return { width, height: 0, top: 0, left: 0, right: width, bottom: 0, x: 0, y: 0 } as DOMRect
  })

  Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
    configurable: true,
    get(this: HTMLElement) {
      return this.classList.contains('text-editor-toolbar-items') ? containerWidth : 0
    }
  })
}

describe('TextEditorToolbar', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    Reflect.deleteProperty(HTMLElement.prototype, 'clientWidth')
  })

  it('keeps all actions in the toolbar if they fit', async () => {
    mockWidths(20, 500)
    const { wrapper } = mountToolbar()

    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.text-editor-toolbar-overflow-trigger').attributes('aria-hidden')).toBe(
      'true'
    )
    wrapper
      .findAll('button:not(.text-editor-toolbar-overflow-trigger)')
      .forEach((button) => expect(button.attributes('aria-hidden')).toBe('false'))
    wrapper.unmount()
  })

  it('moves actions that do not fit into the overflow menu', async () => {
    mockWidths(60, 100)
    const { wrapper } = mountToolbar()

    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.text-editor-toolbar-overflow-trigger').attributes('aria-hidden')).toBe(
      'false'
    )
    wrapper
      .findAll('button:not(.text-editor-toolbar-overflow-trigger)')
      .forEach((button) => expect(button.attributes('aria-hidden')).toBe('true'))
    wrapper.unmount()
  })

  it('keeps regular actions enabled outside source mode', () => {
    const { wrapper } = mountToolbar(false)
    const buttons = wrapper.findAll('button:not(.text-editor-toolbar-overflow-trigger)')

    expect(buttons).toHaveLength(2)
    expect(buttons[0].attributes('disabled')).toBeUndefined()
    expect(buttons[1].attributes('disabled')).toBeUndefined()
    wrapper.unmount()
  })

  it('disables all toolbar actions except source toggle in source mode', () => {
    const { wrapper } = mountToolbar(true)
    const buttons = wrapper.findAll('button:not(.text-editor-toolbar-overflow-trigger)')

    expect(buttons).toHaveLength(2)
    expect(buttons[0].attributes('disabled')).toBeUndefined()
    expect(buttons[1].attributes('disabled')).toBeDefined()
    wrapper.unmount()
  })

  it('disables all toolbar actions except source toggle in html source mode', () => {
    const { wrapper } = mountToolbar(true, 'html')
    const buttons = wrapper.findAll('button:not(.text-editor-toolbar-overflow-trigger)')

    expect(buttons).toHaveLength(2)
    expect(buttons[0].attributes('disabled')).toBeUndefined()
    expect(buttons[1].attributes('disabled')).toBeDefined()
    wrapper.unmount()
  })

  it('opens search menu on Ctrl+F when editor is focused', async () => {
    const { wrapper, showSpy, isFocusedRef } = mountToolbar(false, 'markdown', true)
    isFocusedRef.value = true

    await wrapper.vm.$nextTick()
    await new Promise((resolve) => setTimeout(resolve, 0))

    const event = new KeyboardEvent('keydown', {
      key: 'f',
      ctrlKey: true,
      bubbles: true,
      cancelable: true
    })
    document.dispatchEvent(event)

    await wrapper.vm.$nextTick()
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(showSpy).toHaveBeenCalledOnce()
    wrapper.unmount()
  })

  it('opens search menu on Cmd+F when editor is focused', async () => {
    const { wrapper, showSpy, isFocusedRef } = mountToolbar(false, 'markdown', true)
    isFocusedRef.value = true

    await wrapper.vm.$nextTick()
    await new Promise((resolve) => setTimeout(resolve, 0))

    const event = new KeyboardEvent('keydown', {
      key: 'f',
      metaKey: true,
      bubbles: true,
      cancelable: true
    })
    document.dispatchEvent(event)

    await wrapper.vm.$nextTick()
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(showSpy).toHaveBeenCalledOnce()
    wrapper.unmount()
  })

  it('does not open search menu on Ctrl+F when editor is not focused', async () => {
    const { wrapper, showSpy, isFocusedRef } = mountToolbar(false, 'markdown', true)
    isFocusedRef.value = false

    const event = new KeyboardEvent('keydown', {
      key: 'f',
      ctrlKey: true,
      bubbles: true,
      cancelable: true
    })
    document.dispatchEvent(event)

    await wrapper.vm.$nextTick()
    expect(showSpy).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('shows the collaboration status indicator for connected, disconnected, and connecting', () => {
    const connected = mountToolbar(false, 'markdown', false, 'connected')
    expect(connected.wrapper.find('.text-editor-toolbar-collaboration-status').exists()).toBe(true)
    connected.wrapper.unmount()

    const disconnected = mountToolbar(false, 'markdown', false, 'disconnected')
    expect(disconnected.wrapper.find('.text-editor-toolbar-collaboration-status').exists()).toBe(
      true
    )
    disconnected.wrapper.unmount()

    const connecting = mountToolbar(false, 'markdown', false, 'connecting')
    expect(connecting.wrapper.find('.text-editor-toolbar-collaboration-status').exists()).toBe(true)
    connecting.wrapper.unmount()

    const local = mountToolbar(false, 'markdown', false, 'local')
    expect(local.wrapper.find('.text-editor-toolbar-collaboration-status').exists()).toBe(false)
    local.wrapper.unmount()
  })

  it('sets correct aria-label and icon for connected status', () => {
    const { wrapper } = mountToolbar(false, 'markdown', false, 'connected')
    const indicator = wrapper.find('.text-editor-toolbar-collaboration-status')
    expect(indicator.attributes('aria-label')).toBe('Collaboration ready')
    expect(indicator.find('oc-icon-stub').attributes('name')).toBe('wifi')
    wrapper.unmount()
  })

  it('sets correct aria-label and icon for disconnected status', () => {
    const { wrapper } = mountToolbar(false, 'markdown', false, 'disconnected')
    const indicator = wrapper.find('.text-editor-toolbar-collaboration-status')
    expect(indicator.attributes('aria-label')).toBe('Collaboration disconnected')
    expect(indicator.find('oc-icon-stub').attributes('name')).toBe('wifi-off')
    wrapper.unmount()
  })

  it('sets correct aria-label and icon for connecting status', () => {
    const { wrapper } = mountToolbar(false, 'markdown', false, 'connecting')
    const indicator = wrapper.find('.text-editor-toolbar-collaboration-status')
    expect(indicator.attributes('aria-label')).toBe('Collaboration connecting...')
    expect(indicator.find('oc-icon-stub').attributes('name')).toBe('wifi')
    wrapper.unmount()
  })

  it('reacts to collaboration status changes after mount', async () => {
    const { wrapper, collaborationStatusRef } = mountToolbar(false, 'markdown', false, null)
    expect(wrapper.find('.text-editor-toolbar-collaboration-status').exists()).toBe(false)

    collaborationStatusRef.value = 'connected'
    await wrapper.vm.$nextTick()
    const connectedIndicator = wrapper.find('.text-editor-toolbar-collaboration-status')
    expect(connectedIndicator.exists()).toBe(true)
    expect(connectedIndicator.find('oc-icon-stub').attributes('name')).toBe('wifi')

    collaborationStatusRef.value = 'disconnected'
    await wrapper.vm.$nextTick()
    const disconnectedIndicator = wrapper.find('.text-editor-toolbar-collaboration-status')
    expect(disconnectedIndicator.exists()).toBe(true)
    expect(disconnectedIndicator.find('oc-icon-stub').attributes('name')).toBe('wifi-off')

    collaborationStatusRef.value = 'local'
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.text-editor-toolbar-collaboration-status').exists()).toBe(false)
    wrapper.unmount()
  })

  it('hides the collaborator stack when nobody is in the room', () => {
    const { wrapper } = mountToolbar(false, 'markdown', false, 'connected')
    expect(wrapper.find('.collaborators-stub').exists()).toBe(false)
    wrapper.unmount()
  })

  it('shows the collaborator stack and follows peers joining', async () => {
    const me: YjsCollaborator = { id: 'me', name: 'Zoe', color: '#111111', isSelf: true }
    const { wrapper, collaboratorsRef } = mountToolbar(false, 'markdown', false, 'connected', [me])
    expect(wrapper.find('.collaborators-stub').attributes('data-count')).toBe('1')

    collaboratorsRef.value = [me, { id: 'p1', name: 'Alice', color: '#222222', isSelf: false }]
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.collaborators-stub').attributes('data-count')).toBe('2')
    wrapper.unmount()
  })
})
