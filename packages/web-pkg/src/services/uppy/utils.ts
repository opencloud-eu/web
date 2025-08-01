import { basename } from 'path'
import { OcMinimalUppyFile } from './uppyService'

/**
 * Constructs a file-like object for a given folder path. This acts as a dummy
 * to represent folders in the Uppy queue.
 */
export const createFolderDummyFile = (path: string): File => {
  return {
    // only use the name of the folder, not the full path
    name: basename(path),

    // fake directory mime type so it can be identified as a folder later
    type: 'directory',

    // set path as relativePath. this differs a bit from files where root files don't
    // have a relativePath.
    relativePath: path
  } as any
}

/**
 * Converts a list of files to the minimal Uppy file format.
 * This is used to add files to the Uppy queue via addFiles() (see below).
 */
export const convertToMinimalUppyFile = (source: string, files: File[]): OcMinimalUppyFile[] => {
  return files.map((file) => ({
    source,
    name: file.name,
    type: file.type,
    data: file,
    meta: {
      // file path relative to the directory the user selected
      relativePath: (file as any).relativePath || null
    } as any
  }))
}
