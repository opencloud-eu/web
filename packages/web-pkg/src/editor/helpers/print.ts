import type { Editor } from '@tiptap/core'
import printEditorCss from '../styles/print-editor.css?raw'

export function printEditorContent(editor: Editor, title: string): void {
  const printFrame = document.createElement('iframe')
  printFrame.style.cssText = `
    position: fixed;
    width: 0;
    height: 0;
    border: 0;
  `

  const content = editor.getHTML()
  console.log(content)

  printFrame.onload = () => {
    const printWindow = printFrame.contentWindow
    if (!printWindow) {
      printFrame.remove()
      return
    }

    printWindow.focus()
    printWindow.print()
    setTimeout(() => printFrame.remove(), 1000)
  }

  printFrame.srcdoc = `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>${title}</title>
        <style>${printEditorCss}</style>
      </head>
      <body>${content}</body>
    </html>
  `

  document.body.appendChild(printFrame)
}
