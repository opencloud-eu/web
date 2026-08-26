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

function getPrintFrame(): HTMLIFrameElement {
  const printFrame = document.body.querySelector('iframe')
  if (!printFrame) {
    throw new Error('Expected print iframe to be appended')
  }
  return printFrame
}

describe('printEditorContent', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    document.body.innerHTML = ''
  })

  it('embeds editor html in the print document', () => {
    const editor = createEditor(
      '<p><span style="background-color: #ffffcc; color: #000000;">highlighted</span></p>'
    )

    printEditorContent(editor, 'My document')

    const printFrame = getPrintFrame()
    expect(printFrame.srcdoc).toContain('<title>My document</title>')
    expect(printFrame.srcdoc).toContain('background-color: #ffffcc; color: #000000;')
    expect(printFrame.srcdoc).toContain('<style>')
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

  it('focuses and prints when iframe window is available', () => {
    const editor = createEditor('<p>content</p>')
    printEditorContent(editor, 'My document')

    const printFrame = getPrintFrame()
    const focus = vi.fn()
    const print = vi.fn()
    Object.defineProperty(printFrame, 'contentWindow', {
      value: { focus, print },
      configurable: true
    })

    printFrame.onload?.(new Event('load'))

    expect(focus).toHaveBeenCalledOnce()
    expect(print).toHaveBeenCalledOnce()

    vi.runAllTimers()
    expect(document.body.contains(printFrame)).toBe(false)
  })

  it('removes iframe and skips print when iframe window is unavailable', () => {
    const editor = createEditor('<p>content</p>')
    printEditorContent(editor, 'My document')

    const printFrame = getPrintFrame()
    Object.defineProperty(printFrame, 'contentWindow', {
      value: null,
      configurable: true
    })

    printFrame.onload?.(new Event('load'))

    expect(document.body.contains(printFrame)).toBe(false)
  })
})
