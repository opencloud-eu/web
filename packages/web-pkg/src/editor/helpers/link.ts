import { getMarkRange } from '@tiptap/core'
import type { Editor, Range } from '@tiptap/core'
import type { TextEditorState } from '../types'

export interface RequestLinkPanelOptions {
  range?: Range
  linkRange?: Range | null
  view?: 'actions' | 'edit'
}

export function findLinkRange(
  editor: Editor,
  position = editor.state.selection.from
): Range | null {
  const linkType = editor.schema.marks.link
  if (!linkType) {
    return null
  }

  return getMarkRange(editor.state.doc.resolve(position), linkType) || null
}

function getLinkHref(editor: Editor, range: Range): string {
  const linkType = editor.schema.marks.link
  const node = editor.state.doc.nodeAt(range.from)
  const mark = node?.marks.find(({ type }) => type === linkType)
  return typeof mark?.attrs.href === 'string' ? mark.attrs.href : ''
}

export function requestLinkPanel(
  editor: Editor,
  state: TextEditorState,
  options: RequestLinkPanelOptions = {}
): void {
  const selectionRange = options.range || {
    from: editor.state.selection.from,
    to: editor.state.selection.to
  }
  const linkRange =
    options.linkRange === undefined ? findLinkRange(editor, selectionRange.from) : options.linkRange
  const range = linkRange || selectionRange

  editor.commands.setTextSelection(range)
  state.linkPanel.value = {
    range,
    href: linkRange ? getLinkHref(editor, linkRange) : '',
    text: editor.state.doc.textBetween(range.from, range.to),
    view: options.view || 'edit'
  }
}
