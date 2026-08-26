import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { Editor } from '@tiptap/core'
import { printEditorContent } from '../../../../src/editor/helpers/print'

function createEditor(content: string): Editor {
  return {
    getHTML: () => content
  } as unknown as Editor
}

function createMockWindow() {
  const mockDocument = {
    title: '',
    head: {
      append: vi.fn()
    },
    body: {
      append: vi.fn()
    },
    createElement: vi.fn((tag: string) => {
      if (tag === 'style') {
        return { textContent: '' }
      }
      if (tag === 'div') {
        return { innerHTML: '' }
      }
      return {}
    })
  }

  return {
    document: mockDocument,
    focus: vi.fn(),
    print: vi.fn(),
    close: vi.fn()
  }
}

describe('printEditorContent', () => {
  let windowOpenSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    windowOpenSpy = vi.spyOn(window, 'open')
  })

  afterEach(() => {
    windowOpenSpy.mockRestore()
  })

  it('embeds editor html in the print document', () => {
    const mockWindow = createMockWindow()
    windowOpenSpy.mockReturnValue(mockWindow as any)

    const editor = createEditor(
      '<p><span style="background-color: #ffffcc; color: #000000;">highlighted</span></p>'
    )

    printEditorContent(editor, 'My document')

    expect(mockWindow.document.title).toBe('My document')
    expect(mockWindow.document.head.append).toHaveBeenCalled()
    expect(mockWindow.document.body.append).toHaveBeenCalled()

    const styleCall = mockWindow.document.head.append.mock.calls[0][0]
    expect(styleCall.textContent).toContain('body { padding: 20mm; }')
    expect(styleCall.textContent).toContain('@media print { body { padding: 0; } }')

    const contentCall = mockWindow.document.body.append.mock.calls[0][0]
    expect(contentCall.innerHTML).toContain('background-color: #ffffcc; color: #000000;')
  })

  it('defines print color adjustment in the stylesheet', () => {
    const stylesheetPath = resolve(
      process.cwd(),
      'packages/web-pkg/src/editor/styles/print-editor.css'
    )
    const stylesheet = readFileSync(stylesheetPath, 'utf8')

    expect(stylesheet).toContain('-webkit-print-color-adjust: exact;')
    expect(stylesheet).toContain('print-color-adjust: exact;')
    expect(stylesheet).toContain('th {')
    expect(stylesheet).toContain('background: rgba(148, 163, 184, 0.08);')
  })

  it('focuses, prints and closes the window', () => {
    const mockWindow = createMockWindow()
    windowOpenSpy.mockReturnValue(mockWindow as any)

    const editor = createEditor('<p>content</p>')
    printEditorContent(editor, 'My document')

    expect(mockWindow.focus).toHaveBeenCalledOnce()
    expect(mockWindow.print).toHaveBeenCalledOnce()
    expect(mockWindow.close).toHaveBeenCalledOnce()
  })

  it('returns early when window.open fails', () => {
    windowOpenSpy.mockReturnValue(null)

    const editor = createEditor('<p>content</p>')
    printEditorContent(editor, 'My document')

    expect(windowOpenSpy).toHaveBeenCalledWith('', '_blank')
  })
})
