import FileHandler from '@tiptap/extension-file-handler'
import type { Editor, Extension } from '@tiptap/core'

const isSupportedImageFile = (file: File) => file.type.startsWith('image/')

const readFileAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.addEventListener('load', () => resolve(reader.result as string))
    reader.addEventListener('error', () => reject(new Error('Failed to read dropped image file')))
    reader.readAsDataURL(file)
  })

const insertDroppedImages = async (editor: Editor, files: File[], pos: number) => {
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
      // Ignore failed files and continue with remaining drops.
    }
  }
}

export const imageFileHandlerExtension = (): Extension =>
  FileHandler.configure({
    onDrop: (editor, files, pos) => {
      void insertDroppedImages(editor, files, pos)
    }
  })
