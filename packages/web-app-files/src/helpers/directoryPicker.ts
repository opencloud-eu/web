import { urlJoin } from '@opencloud-eu/web-client'
import { createFolderDummyFile } from '@opencloud-eu/web-pkg'

/**
 * This method uses the Directory API to retrieve items from a directory
 * that the user selects from their file system for upload.
 * It returns an array of File objects, including dummy files for empty folders.
 *
 * See https://developer.mozilla.org/en-US/docs/Web/API/Window/showDirectoryPicker
 */
export const getItemsViaDirectoryPicker = async (
  onError?: (error?: unknown) => void
): Promise<File[]> => {
  const dirHandle: FileSystemDirectoryHandle = await (window as any).showDirectoryPicker()

  async function* getItemsFromDirectory(
    dirHandle: FileSystemDirectoryHandle,
    path: string
  ): AsyncGenerator<File> {
    let hasFiles = false

    for await (const [name, handle] of (dirHandle as any).entries()) {
      if (handle.kind === 'directory') {
        // recurse into the directory
        yield* getItemsFromDirectory(handle, urlJoin(path, name))
      } else {
        hasFiles = true
        try {
          const file = await handle.getFile()
          ;(file as any).relativePath = urlJoin(path, name, { leadingSlash: true })
          yield file
        } catch (error) {
          console.log(error)
          onError?.(error)
        }
      }
    }

    if (!hasFiles) {
      // empty folder, create a dummy file to represent it in the Uppy queue.
      // note that a folder that only contains other folders is always considered empty,
      // even if there are files located further down the hierarchy. this is because we don't
      // have insight into the contents of the subfolders at this point.
      yield createFolderDummyFile(path)
    }
  }

  const items: File[] = []
  for await (const item of getItemsFromDirectory(dirHandle, dirHandle.name)) {
    items.push(item)
  }

  return items
}
