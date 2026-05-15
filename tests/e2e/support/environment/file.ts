import fs from 'fs'
import path from 'path'
import { appConfig } from '../../playwright.config'
import { File } from '../types'

export class FilesEnvironment {
  getFile({ name }: { name: string }): File {
    const relPath = path.join(appConfig.assetsPath, name)
    if (!fs.existsSync(relPath)) {
      throw new Error('TODO: fixture files')
    }

    return { name, path: path.resolve(relPath) }
  }
}
