import FileHandler from '@tiptap/extension-file-handler'
import type { Editor, Extension } from '@tiptap/core'

// Explicit list instead of `image/*`, because the file handler matches mime types exactly
const supportedImageMimeTypes = [
  'image/apng',
  'image/avif',
  'image/bmp',
  'image/gif',
  'image/jpeg',
  'image/png',
  'image/svg+xml',
  'image/webp'
]

const isSupportedImageFile = (file: File) => supportedImageMimeTypes.includes(file.type)

const readFileAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.addEventListener('load', () => resolve(reader.result as string))
    reader.addEventListener('error', () => reject(new Error('Failed to read image file')))
    reader.readAsDataURL(file)
  })

const insertImages = async (editor: Editor, files: File[], pos: number) => {
  const imageFiles = files.filter(isSupportedImageFile)
  if (imageFiles.length === 0) {
    return
  }

  let insertPos = pos
  for (const file of imageFiles) {
    try {
      const src = await readFileAsDataUrl(file)
      const inserted = editor
        .chain()
        .focus()
        .insertContentAt(insertPos, { type: 'image', attrs: { src } })
        .run()

      if (!inserted) {
        editor.chain().focus().setImage({ src }).run()
      }
      insertPos += 1
    } catch {
      // Ignore failed files and continue with the remaining ones.
    }
  }
}

export const imageFileHandlerExtension = (): Extension =>
  FileHandler.configure({
    onDrop: (editor, files, pos) => insertImages(editor, files, pos),
    // Copied images usually come with a text/html payload like `<img src="blob:...">`
    // (e.g. from the preview app). Its source only lives as long as the page that created
    // it, so consume the event and embed the image file itself instead.
    onPaste: (editor, files) => insertImages(editor, files, editor.state.selection.from),
    consumePasteEvent: true,
    // Lets clipboard payloads without images (e.g. other copied files) reach the default paste
    allowedMimeTypes: supportedImageMimeTypes
  })
