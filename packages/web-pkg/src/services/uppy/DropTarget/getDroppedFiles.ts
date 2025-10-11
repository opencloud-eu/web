import { urlJoin } from '@opencloud-eu/web-client'
import { createFolderDummyFile } from '../utils'

/**
 * Methods to retrieve dropped files from a DataTransfer object.
 * This is inspired by WICG examples and the Uppy `getDroppedFiles` function.
 *
 * https://wicg.github.io/entries-api/#api-directoryreader
 * https://github.com/transloadit/uppy/blob/main/packages/%40uppy/utils/src/getDroppedFiles/README.md
 */

const convertEntryToFile = async (entry: FileSystemFileEntry): Promise<File> => {
  const file = await new Promise((resolve, reject) => entry.file(resolve, reject))
  const isRootFile = entry.fullPath === urlJoin(entry.name, { leadingSlash: true })
  if (!isRootFile) {
    // add relativePath to the file object just like Uppy does and expects it
    ;(file as any).relativePath = entry.fullPath
  }

  return file as File
}

const getAsEntry = (item: any): ReturnType<DataTransferItem['webkitGetAsEntry']> => {
  // `webkitGetAsEntry` might get renamed to `getAsEntry` in the future.
  // see https://developer.mozilla.org/en-US/docs/Web/API/DataTransferItem/webkitGetAsEntry
  return typeof item.getAsEntry === 'function' ? item.getAsEntry() : item.webkitGetAsEntry()
}

async function* readDirectory(dirEntry: FileSystemDirectoryEntry): AsyncGenerator<FileSystemEntry> {
  const reader = dirEntry.createReader()
  const getNextBatch = () =>
    new Promise<FileSystemEntry[]>((resolve, reject) => {
      reader.readEntries(resolve, reject)
    })

  let entries: FileSystemEntry[]
  do {
    entries = await getNextBatch()
    for (const entry of entries) {
      yield entry
    }
  } while (entries.length > 0)
}

async function* getFile(
  entry: FileSystemEntry,
  logDropError?: (error?: Error) => void
): AsyncGenerator<File> {
  if (entry.isDirectory) {
    let hasFiles = false // check for empty directories later

    for await (const e of readDirectory(entry as FileSystemDirectoryEntry)) {
      if (e.isDirectory) {
        // recurse into the directory
        yield* getFile(e, logDropError)
      } else if (e.isFile) {
        try {
          hasFiles = true
          yield convertEntryToFile(e as FileSystemFileEntry)
        } catch (error) {
          console.error(error)
          logDropError?.(error)
        }
      }
    }

    if (!hasFiles) {
      // empty folder, create a dummy file to represent it in the Uppy queue.
      // note that a folder that only contains other folders is always considered empty,
      // even if there are files located further down the hierarchy. this is because we don't
      // have insight into the contents of the subfolders at this point.
      yield createFolderDummyFile(entry.fullPath || entry.name)
    }
  } else {
    try {
      yield convertEntryToFile(entry as FileSystemFileEntry)
    } catch (error) {
      console.error(error)
      logDropError?.(error)
    }
  }
}

export const getDroppedFiles = async (
  dataTransfer: DataTransfer,
  logDropError?: (error?: Error) => void
): Promise<File[]> => {
  try {
    const files: File[] = []

    // convert DataTransfer items to FileSystemEntry objects. this needs to happen at the beginning,
    // otherwise only the first item will be processed.
    const items = await Promise.all(Array.from(dataTransfer.items, (item) => getAsEntry(item)))

    for (let i = 0; i < items.length; i++) {
      for await (const file of getFile(items[i], logDropError)) {
        files.push(file)
      }
    }

    return files
  } catch (e) {
    console.error(e)
    const files = Array.from(dataTransfer.files)
    return Promise.resolve(files)
  }
}
