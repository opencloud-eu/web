import { getComposableWrapper } from '@opencloud-eu/web-test-helpers'
import { useMessages, type Message } from '@opencloud-eu/web-pkg'
import { usePdfEditorUndoBar } from '../../../src/composables/usePdfEditorUndoBar'
import { getMissingMembers } from '../pdfjsSource'

function setup() {
  const onChange = vi.fn()
  let undoBar: ReturnType<typeof usePdfEditorUndoBar>
  let messages: ReturnType<typeof useMessages>
  const wrapper = getComposableWrapper(() => {
    messages = useMessages()
    vi.mocked(messages.showMessage).mockImplementation((data) => ({ ...data, id: 'message' }))
    undoBar = usePdfEditorUndoBar({ onChange })
  })
  function shownMessage() {
    return vi.mocked(messages.showMessage).mock.calls.at(-1)[0] as Message
  }
  return { editorUndoBar: undoBar.editorUndoBar, messages, shownMessage, onChange, wrapper }
}

describe('usePdfEditorUndoBar', () => {
  // PDF.js does without what is missing, e.g. after an update.
  it('provides everything PDF.js uses of the undo bar', () => {
    expect(getMissingMembers('editorUndoBar', setup().editorUndoBar)).toEqual([])
  })

  it('names what was removed', () => {
    const { editorUndoBar, shownMessage } = setup()
    editorUndoBar.show(vi.fn(), 'highlight')
    expect(shownMessage().title).toBe('Highlight removed')
    editorUndoBar.show(vi.fn(), 3)
    expect(shownMessage().title).toBe('3 annotations removed')
  })

  it('undoes the removal and reports the change', async () => {
    const { editorUndoBar, messages, shownMessage, onChange } = setup()
    const undo = vi.fn()
    editorUndoBar.show(undo, 'ink')
    const [action] = shownMessage().actions
    expect(action.label()).toBe('Undo')
    await action.handler()
    expect(undo).toHaveBeenCalled()
    expect(onChange).toHaveBeenCalled()
    expect(messages.removeMessage).toHaveBeenCalledWith(expect.objectContaining({ id: 'message' }))
  })

  it('hides the message when PDF.js does, e.g. for a new annotation', () => {
    const { editorUndoBar, messages } = setup()
    editorUndoBar.show(vi.fn(), 'stamp')
    editorUndoBar.hide()
    expect(messages.removeMessage).toHaveBeenCalledTimes(1)
    editorUndoBar.hide()
    expect(messages.removeMessage).toHaveBeenCalledTimes(1)
  })

  it('hides the message when the viewer is closed', () => {
    const { editorUndoBar, messages, wrapper } = setup()
    editorUndoBar.show(vi.fn(), 'freetext')
    wrapper.unmount()
    expect(messages.removeMessage).toHaveBeenCalled()
  })
})
