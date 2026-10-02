import { Editor } from '@tiptap/core'
import Image from '@tiptap/extension-image'
import StarterKit from '@tiptap/starter-kit'
import { describe, expect, it, vi } from 'vitest'
import { imageFileHandlerExtension } from '../../../../src/editor/extensions/imageFileHandler'

function createEditor(): Editor {
  return new Editor({
    extensions: [
      StarterKit,
      Image.configure({ inline: false, allowBase64: true }),
      imageFileHandlerExtension()
    ]
  })
}

function createClipboardEvent({ files = [], html = '' }: { files?: File[]; html?: string }) {
  const event = new Event('paste', { bubbles: true, cancelable: true }) as ClipboardEvent

  Object.defineProperty(event, 'clipboardData', {
    value: {
      files,
      getData: (type: string) => (type === 'text/html' ? html : '')
    }
  })

  return event
}

function getImageSources(editor: Editor) {
  const sources: string[] = []
  editor.state.doc.descendants((node) => {
    if (node.type.name === 'image') {
      sources.push(node.attrs.src)
    }
  })
  return sources
}

describe('image file handler extension', () => {
  it('embeds a pasted image file as data url instead of the html image source', async () => {
    const editor = createEditor()
    const file = new File(['image'], 'image.png', { type: 'image/png' })
    const event = createClipboardEvent({
      files: [file],
      html: '<img src="blob:https://localhost/2c3c4f5e">'
    })

    try {
      editor.view.dom.dispatchEvent(event)

      expect(event.defaultPrevented).toBe(true)
      await vi.waitFor(() => expect(getImageSources(editor)).toHaveLength(1))
      expect(getImageSources(editor)[0]).toMatch(/^data:image\/png;base64,/)
    } finally {
      editor.destroy()
    }
  })

  it('leaves clipboard payloads without image files to the default paste handling', () => {
    const editor = createEditor()
    const file = new File(['pdf'], 'document.pdf', { type: 'application/pdf' })
    const event = createClipboardEvent({ files: [file], html: '<p>document.pdf</p>' })

    try {
      editor.view.dom.dispatchEvent(event)

      expect(getImageSources(editor)).toHaveLength(0)
      expect(editor.state.doc.textContent).toBe('document.pdf')
    } finally {
      editor.destroy()
    }
  })

  it('does not paste images into read-only editors', async () => {
    const editor = createEditor()
    editor.setEditable(false)
    const file = new File(['image'], 'image.png', { type: 'image/png' })
    const event = createClipboardEvent({ files: [file] })

    try {
      editor.view.dom.dispatchEvent(event)

      await new Promise((resolve) => setTimeout(resolve))
      expect(getImageSources(editor)).toHaveLength(0)
    } finally {
      editor.destroy()
    }
  })
})
