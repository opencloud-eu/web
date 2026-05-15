import { World } from '../environment/world'
import * as tempFs from '../support/utils/runtimeFs'
import { Given } from '../environment/fixtures'

Given(
  'the user creates a file {string} of {string} size in the temp upload directory',
  ({ world }: { world: World }, fileName: string, fileSize: string): Promise<void> => {
    return tempFs.createFileWithSize(fileName, tempFs.getBytes(fileSize))
  }
)
