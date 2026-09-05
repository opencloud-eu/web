import { PartialComponentProps, defaultPlugins, mount } from '@opencloud-eu/web-test-helpers'
import { mock } from 'vitest-mock-extended'
import { computed, defineComponent, shallowRef, toRaw, toValue } from 'vue'
import * as Y from 'yjs'
import { Awareness } from 'y-protocols/awareness'
import type { Editor } from '@tiptap/vue-3'
import type { Resource, SpaceResource } from '@opencloud-eu/web-client'
import { useAuthStore, useMentionUsers, type YjsStatus } from '@opencloud-eu/web-pkg'
import type { MentionItem, TextEditorOptions } from '@opencloud-eu/web-pkg/editor'
import App from '../../src/App.vue'

// The editor itself is covered by web-pkg. What App.vue owns is the decision
// of *which* options the editor gets, so we capture those instead of mounting
// a real ProseMirror stack.
const useTextEditor = vi.hoisted(() => vi.fn())
const getMentionUsers = vi.fn<(query: string) => Promise<MentionItem[]>>()
const notifyMentionedUsers = vi.fn<() => Promise<void>>()
const resetMentionState = vi.fn()
const selectMentionUser = vi.fn()

vi.mock('@opencloud-eu/web-pkg', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useAuthStore: vi.fn(),
  useMentionUsers: vi.fn()
}))

vi.mock('@opencloud-eu/web-pkg/editor', async (importOriginal) => {
  const original = await importOriginal<Record<string, unknown>>()
  return {
    ...original,
    useTextEditor,
    TextEditorProvider: defineComponent({
      props: { editor: { type: Object, default: null } },
      template: '<div><slot /></div>'
    }),
    TextEditorContent: defineComponent({ template: '<div class="text-editor-content" />' }),
    TextEditorToolbar: defineComponent({ template: '<div class="text-editor-toolbar" />' })
  }
})

beforeEach(() => {
  useTextEditor.mockReset()
  useTextEditor.mockReturnValue({ editor: shallowRef<Editor | null>(null) })
  getMentionUsers.mockResolvedValue([])
  notifyMentionedUsers.mockResolvedValue()
  vi.mocked(useMentionUsers).mockReturnValue({
    getMentionUsers,
    notifyMentionedUsers,
    ownMentionLabel: computed(() => 'Own User'),
    resetMentionState,
    selectMentionUser
  })
  vi.mocked(useAuthStore).mockReturnValue(
    mock<ReturnType<typeof useAuthStore>>({ userContextReady: true })
  )
})

function lastOptions(): TextEditorOptions {
  return useTextEditor.mock.calls.at(-1)[0]
}

describe('Text editor app', () => {
  it('binds the editor to the Y.Doc and awareness it was handed', () => {
    const ydoc = new Y.Doc()
    const awareness = new Awareness(ydoc)
    getWrapper({ ydoc, awareness })

    // toRaw because vue-test-utils wraps mounted props in `reactive()`. The
    // real AppWrapper hands these over from a shallowRef, so they stay raw.
    expect(toRaw(lastOptions().ydoc)).toBe(ydoc)
    expect(toRaw(lastOptions().awareness)).toBe(awareness)
  })

  it('detects the content type from the resource', () => {
    getWrapper({ resource: mock<Resource>({ extension: 'md', mimeType: 'text/markdown' }) })
    expect(lastOptions().contentType).toBe('markdown')

    getWrapper({ resource: mock<Resource>({ extension: 'ocnote', mimeType: 'application/json' }) })
    expect(lastOptions().contentType).toBe('tiptap-json')

    getWrapper({ resource: mock<Resource>({ extension: 'ts', mimeType: 'text/plain' }) })
    expect(lastOptions().contentType).toBe('plain-text')
  })

  it('only sets a placeholder for editable rich text content', () => {
    getWrapper({ resource: mock<Resource>({ extension: 'md', mimeType: 'text/markdown' }) })
    expect(lastOptions().placeholder).toBeTruthy()

    getWrapper({ resource: mock<Resource>({ extension: 'ocnote', mimeType: 'application/json' }) })
    expect(lastOptions().placeholder).toBeTruthy()

    getWrapper({ resource: mock<Resource>({ extension: 'txt', mimeType: 'text/plain' }) })
    expect(lastOptions().placeholder).toBeUndefined()

    getWrapper({
      isReadOnly: true,
      resource: mock<Resource>({ extension: 'md', mimeType: 'text/markdown' })
    })
    expect(lastOptions().placeholder).toBeUndefined()
  })

  it('shows the toolbar when editable and hides it when read-only', () => {
    expect(getWrapper().wrapper.find('.text-editor-toolbar').exists()).toBe(true)
    expect(getWrapper({ isReadOnly: true }).wrapper.find('.text-editor-toolbar').exists()).toBe(
      false
    )
  })

  it('passes the yjs status into useTextEditor', () => {
    getWrapper({ yjsStatus: 'connected' })
    expect(toValue(lastOptions().yjsStatus)).toBe('connected')
  })

  it('updates useTextEditor options when yjsStatus changes after mount', async () => {
    const { wrapper } = getWrapper({ yjsStatus: 'connecting' })
    expect(toValue(lastOptions().yjsStatus)).toBe('connecting')

    await wrapper.setProps({ yjsStatus: 'connected' })
    expect(toValue(lastOptions().yjsStatus)).toBe('connected')
  })

  it('provides mention users to the editor and remembers a selection', async () => {
    const mentionUsers = [{ id: 'alice', label: 'Alice' }]
    getMentionUsers.mockResolvedValue(mentionUsers)
    getWrapper({ resource: markdownResource() })

    await expect(lastOptions().mentions?.getItems('ali')).resolves.toEqual(mentionUsers)
    lastOptions().mentions?.onSelect(mentionUsers[0])

    expect(getMentionUsers).toHaveBeenCalledWith('ali')
    expect(selectMentionUser).toHaveBeenCalledWith(mentionUsers[0])
  })

  it('highlights the own name without loading any users', () => {
    getWrapper({ resource: markdownResource() })

    expect(lastOptions().mentions?.highlightLabels).toEqual(['Own User'])
    expect(getMentionUsers).not.toHaveBeenCalled()
  })

  it('notifies the mentions of the content that was persisted', async () => {
    const { wrapper } = getWrapper({ resource: markdownResource() })
    const [[saveCallback]] = wrapper.emitted('register:onSaveCallback') as [
      [(content: unknown) => Promise<void>]
    ]

    await saveCallback('hello @Alice')

    expect(notifyMentionedUsers).toHaveBeenCalledWith('hello @Alice')
  })

  it('notifies nothing verifiable when the persisted content is not text', async () => {
    const { wrapper } = getWrapper({ resource: markdownResource() })
    const [[saveCallback]] = wrapper.emitted('register:onSaveCallback') as [
      [(content: unknown) => Promise<void>]
    ]

    await saveCallback(new ArrayBuffer(8))

    expect(notifyMentionedUsers).toHaveBeenCalledWith(undefined)
  })

  it('disables mentions for content that is not rich text', () => {
    const { wrapper } = getWrapper({
      resource: mock<Resource>({ extension: 'txt', mimeType: 'text/plain' })
    })

    expect(lastOptions().mentions).toBeUndefined()
    expect(wrapper.emitted('register:onSaveCallback')).toBeUndefined()
  })

  it('disables mentions without a user context, e.g. on public links', () => {
    vi.mocked(useAuthStore).mockReturnValue(
      mock<ReturnType<typeof useAuthStore>>({ userContextReady: false })
    )
    const { wrapper } = getWrapper({ resource: markdownResource() })

    expect(lastOptions().mentions).toBeUndefined()
    expect(wrapper.emitted('register:onSaveCallback')).toBeUndefined()
  })
})

function markdownResource() {
  return mock<Resource>({ extension: 'md', mimeType: 'text/markdown' })
}

function getWrapper(props: PartialComponentProps<typeof App> = {}) {
  const ydoc = (props.ydoc as Y.Doc) ?? new Y.Doc()
  const yjsStatus = (props.yjsStatus as YjsStatus | null | undefined) ?? null
  return {
    wrapper: mount(App, {
      props: {
        currentContent: '',
        isReadOnly: false,
        resource: mock<Resource>({ extension: 'txt', mimeType: 'text/plain' }),
        space: mock<SpaceResource>(),
        awareness: new Awareness(ydoc),
        yjsStatus,
        ...props,
        ydoc
      },
      global: { plugins: defaultPlugins() }
    })
  }
}
