import { mount } from '@vue/test-utils'
import { nextTick, ref } from 'vue'
import type { TextEditorInstance } from '../../../../src/editor/types'
import TextEditorSourceView from '../../../../src/editor/components/TextEditorSourceView.vue'
import { defaultPlugins } from '@opencloud-eu/web-test-helpers'

function mountSourceView({
  contentType = 'markdown',
  sourceModeReadonly = false,
  yjsActive = false,
  content = '# Initial'
}: {
  contentType?: 'markdown' | 'html' | 'plain-text'
  sourceModeReadonly?: boolean
  yjsActive?: boolean
  content?: string
} = {}) {
  const setContent = vi.fn()

  // Lets a test play a document update - the editor emits `update` for local
  // and remote (Yjs) changes alike.
  let editorContent = content
  const listeners = new Map<string, Set<() => void>>()
  const emitEditorUpdate = (next: string) => {
    editorContent = next
    listeners.get('update')?.forEach((listener) => listener())
  }

  const textEditor = {
    editor: ref({
      commands: { setContent },
      on: vi.fn((event: string, listener: () => void) => {
        listeners.set(event, (listeners.get(event) ?? new Set()).add(listener))
      }),
      off: vi.fn((event: string, listener: () => void) => {
        listeners.get(event)?.delete(listener)
      })
    }),
    contentType: ref(contentType),
    yjsActive: ref(yjsActive),
    state: {
      sourceMode: ref(true),
      sourceModeReadonly: ref(sourceModeReadonly)
    },
    getContent: vi.fn(() => editorContent)
  } as unknown as TextEditorInstance

  const wrapper = mount(TextEditorSourceView, {
    props: { editor: textEditor },
    global: { plugins: [...defaultPlugins()] }
  })

  return { wrapper, textEditor, setContent, emitEditorUpdate }
}

describe('TextEditorSourceView', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows the raw markdown and writes edits back to the editor', async () => {
    const { wrapper, setContent } = mountSourceView()

    const textarea = wrapper.find('textarea')
    expect((textarea.element as HTMLTextAreaElement).value).toBe('# Initial')
    expect(textarea.attributes('readonly')).toBeUndefined()

    await textarea.setValue('| a | b |\n|---|---|\n| 1 | 2 |')
    expect(setContent).toHaveBeenCalledWith('| a | b |\n|---|---|\n| 1 | 2 |', {
      contentType: 'markdown',
      emitUpdate: true
    })
  })

  it('writes html edits back with the html content type', async () => {
    const { wrapper, setContent } = mountSourceView({
      contentType: 'html',
      content: '<p>Initial</p>'
    })

    await wrapper.find('textarea').setValue('<h1>Hello</h1><p>World</p>')
    expect(setContent).toHaveBeenCalledWith('<h1>Hello</h1><p>World</p>', {
      contentType: 'html',
      emitUpdate: true
    })
  })

  it('writes plain text edits back without a content type', async () => {
    const { wrapper, setContent } = mountSourceView({ contentType: 'plain-text', content: 'hello' })

    await wrapper.find('textarea').setValue('hello there')
    expect(setContent).toHaveBeenCalledWith('hello there', { emitUpdate: true })
  })

  it('is read-only and swallows input when the source mode is read-only', async () => {
    const { wrapper, setContent } = mountSourceView({ sourceModeReadonly: true })

    const textarea = wrapper.find('textarea')
    expect(textarea.attributes('readonly')).toBeDefined()
    expect(textarea.classes()).toContain('cursor-text')

    await textarea.setValue('# Edited')
    expect(setContent).not.toHaveBeenCalled()
  })

  it('follows document updates while a Yjs session is active', async () => {
    vi.useFakeTimers()
    const { wrapper, emitEditorUpdate } = mountSourceView({
      yjsActive: true,
      sourceModeReadonly: true
    })

    emitEditorUpdate('# Written by a peer')
    vi.advanceTimersByTime(250)
    await nextTick()

    expect((wrapper.find('textarea').element as HTMLTextAreaElement).value).toBe(
      '# Written by a peer'
    )
  })

  // A remote peer typing emits an `update` per keystroke, so the textarea is
  // only rewritten once the burst has settled.
  it('coalesces a burst of document updates into a single read', async () => {
    vi.useFakeTimers()
    const { wrapper, textEditor, emitEditorUpdate } = mountSourceView({
      yjsActive: true,
      sourceModeReadonly: true
    })
    const readsSoFar = vi.mocked(textEditor.getContent).mock.calls.length

    emitEditorUpdate('# W')
    vi.advanceTimersByTime(100)
    emitEditorUpdate('# Wr')
    vi.advanceTimersByTime(100)
    emitEditorUpdate('# Written by a peer')

    await nextTick()
    expect((wrapper.find('textarea').element as HTMLTextAreaElement).value).toBe('# Initial')

    vi.advanceTimersByTime(250)
    await nextTick()

    expect(vi.mocked(textEditor.getContent).mock.calls.length).toBe(readsSoFar + 1)
    expect((wrapper.find('textarea').element as HTMLTextAreaElement).value).toBe(
      '# Written by a peer'
    )
  })

  it('does not follow document updates without a Yjs session', async () => {
    vi.useFakeTimers()
    const { wrapper, emitEditorUpdate } = mountSourceView()

    emitEditorUpdate('# Written elsewhere')
    vi.advanceTimersByTime(250)
    await nextTick()

    expect((wrapper.find('textarea').element as HTMLTextAreaElement).value).toBe('# Initial')
  })

  it('stops following document updates once it unmounts', () => {
    vi.useFakeTimers()
    const { wrapper, textEditor, emitEditorUpdate } = mountSourceView({
      yjsActive: true,
      sourceModeReadonly: true
    })

    // Queued right before unmounting, so a pending debounce must not fire either.
    emitEditorUpdate('# Written by a peer')
    wrapper.unmount()

    const readsSoFar = vi.mocked(textEditor.getContent).mock.calls.length
    emitEditorUpdate('# Written by another peer')
    vi.advanceTimersByTime(250)
    expect(vi.mocked(textEditor.getContent).mock.calls.length).toBe(readsSoFar)
  })
})
