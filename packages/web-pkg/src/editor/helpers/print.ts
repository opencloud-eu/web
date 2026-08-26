import type { Editor } from '@tiptap/core'
import printEditorCss from '../styles/print-editor.css?raw'

export function printEditorContent(editor: Editor, title: string): void {
  const printWindow = window.open('', '_blank')

  if (!printWindow) {
    return
  }

  const { document } = printWindow

  document.title = title

  const style = document.createElement('style')
  style.textContent = `
    ${printEditorCss}
    body { padding: 20mm; }
    @media print { body { padding: 0; } }
  `

  const content = document.createElement('div')
  content.innerHTML = editor.getHTML()

  document.head.append(style)
  document.body.append(content)

  printWindow.focus()
  printWindow.print()
  printWindow.close()
}
