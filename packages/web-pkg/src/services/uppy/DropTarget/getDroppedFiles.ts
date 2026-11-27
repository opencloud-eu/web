import PQueue from 'p-queue'
import { urlJoin } from '@opencloud-eu/web-client'
import { createFolderDummyFile } from '../utils'

/**
 * Methods to retrieve dropped files from a DataTransfer object.
 * This is inspired by WICG examples and the Uppy `getDroppedFiles` function.
 *
 * https://wicg.github.io/entries-api/#api-directoryreader
 * https://github.com/transloadit/uppy/blob/main/packages/%40uppy/utils/src/getDroppedFiles/README.md
 */

// bounds concurrent file system calls, a dropped folder can hold thousands of entries
const MAX_CONCURRENT_READS = 50

const convertEntryToFile = async (entry: FileSystemFileEntry, queue: PQueue): Promise<File> => {
  const file = await queue.add(
    () => new Promise<File>((resolve, reject) => entry.file(resolve, reject))
  )
  const isRootFile = entry.fullPath === urlJoin(entry.name, { leadingSlash: true })
  if (!isRootFile) {
    // add relativePath to the file object just like Uppy does and expects it
    ;(file as any).relativePath = entry.fullPath
  }

  return file
}

const getAsEntry = (item: any): ReturnType<DataTransferItem['webkitGetAsEntry']> => {
  // `webkitGetAsEntry` might get renamed to `getAsEntry` in the future.
  // see https://developer.mozilla.org/en-US/docs/Web/API/DataTransferItem/webkitGetAsEntry
  return typeof item.getAsEntry === 'function' ? item.getAsEntry() : item.webkitGetAsEntry()
}

async function readDirectory(
  dirEntry: FileSystemDirectoryEntry,
  queue: PQueue
): Promise<FileSystemEntry[]> {
  const reader = dirEntry.createReader()
  const entries: FileSystemEntry[] = []

  // batches must be read one after another until an empty one signals the end
  let batch: FileSystemEntry[]
  do {
    batch = await queue.add(
      () =>
        new Promise<FileSystemEntry[]>((resolve, reject) => {
          reader.readEntries(resolve, reject)
        })
    )
    entries.push(...batch)
  } while (batch.length > 0)

  return entries
}

async function getFiles(
  entry: FileSystemEntry,
  queue: PQueue,
  logDropError?: (error?: Error) => void
): Promise<File[]> {
  if (!entry.isDirectory) {
    try {
      return [await convertEntryToFile(entry as FileSystemFileEntry, queue)]
    } catch (error) {
      console.error(error)
      logDropError?.(error)
      return []
    }
  }

  const entries = (await readDirectory(entry as FileSystemDirectoryEntry, queue)).filter(
    (e) => e.isDirectory || e.isFile
  )
  const files = (await Promise.all(entries.map((e) => getFiles(e, queue, logDropError)))).flat()

  if (!entries.some((e) => e.isFile)) {
    // empty folder, create a dummy file to represent it in the Uppy queue.
    // note that a folder that only contains other folders is always considered empty,
    // even if there are files located further down the hierarchy. this is because we don't
    // have insight into the contents of the subfolders at this point.
    files.push(createFolderDummyFile(entry.fullPath || entry.name))
  }

  return files
}

export const getDroppedFiles = async (
  dataTransfer: DataTransfer,
  logDropError?: (error?: Error) => void
): Promise<File[]> => {
  try {
    // convert DataTransfer items to FileSystemEntry objects. this needs to happen at the beginning,
    // otherwise only the first item will be processed.
    // string data (e.g. of a resource drag inside the app) is no file and has no entry
    const items = Array.from(dataTransfer.items)
      .filter((item) => item.kind === 'file')
      .map((item) => getAsEntry(item))

    const queue = new PQueue({ concurrency: MAX_CONCURRENT_READS })
    const files = await Promise.all(items.map((item) => getFiles(item, queue, logDropError)))
    return files.flat()
  } catch (e) {
    console.error(e)
    return Array.from(dataTransfer.files)
  }
}
