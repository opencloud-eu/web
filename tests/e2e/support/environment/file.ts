import fs from 'fs'
import path from 'path'
import { File } from '../types'
import { resolveAssetPath } from '../utils/runtimeFs'

export class FilesEnvironment {
  getFile({ name }: { name: string }): File {
    const relPath = resolveAssetPath(name)
    if (!fs.existsSync(relPath)) {
      throw new Error('TODO: fixture files')
    }

    return { name, path: path.resolve(relPath) }
  }
}
