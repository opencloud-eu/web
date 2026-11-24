import fs from 'fs'
import path from 'path'
import { appConfig } from '../../playwright.config'

// max file creation size is 10GB
const MAX_FILE_SIZE = Math.pow(1024, 3) * 10

export const getBytes = (fileSize: string): number => {
  fileSize = fileSize.replace(/\s/g, '').toLowerCase()
  const size = parseFloat(fileSize.match(/([\d.]+)/)[0])
  const type = fileSize.match(/[kKmMgGbB]{1,2}/)?.[0]

  let sizeInbytes = size

  if (!type) {
    return sizeInbytes
  }

  switch (type) {
    case 'b':
      sizeInbytes = size
      break
    case 'kb':
      sizeInbytes = size * 1024
      break
    case 'mb':
      sizeInbytes = size * Math.pow(1024, 2)
      break
    case 'gb':
      sizeInbytes = size * Math.pow(1024, 3)
      break
    default:
      throw new Error('Invalid file size. Must be one of these: b, kb, mb, gb')
  }

  if (sizeInbytes > MAX_FILE_SIZE) {
    throw Error(`File size must be less than '${MAX_FILE_SIZE}' bytes, i.e. 10GB`)
  }

  return sizeInbytes
}

// every parallel worker gets its own temp directory, so a finished scenario
// doesn't remove the files of a scenario that is still running in another worker
function getWorkerTempPath(): string {
  return path.join(appConfig.tempAssetsPath, `worker-${process.env.TEST_PARALLEL_INDEX || '0'}`)
}

// resolves a path relative to the fixtures folder, "temp/<file>" points to the temp directory of the current worker
export function resolveAssetPath(name: string): string {
  const relativePath = path.normalize(name).replace(/^[/\\]+/, '')
  const tempDir = path.relative(appConfig.assetsPath, appConfig.tempAssetsPath)
  if (relativePath.startsWith(tempDir + path.sep)) {
    return path.join(getWorkerTempPath(), relativePath.slice(tempDir.length + 1))
  }
  return path.join(appConfig.assetsPath, relativePath)
}

export const getTempUploadPath = (): string => {
  const tempPath = getWorkerTempPath()
  if (!fs.existsSync(tempPath)) {
    fs.mkdirSync(tempPath, { recursive: true })
  }
  return tempPath
}

export const createFileWithSize = (
  fileName: string,
  sizeInBytes: number,
  dir: string = getTempUploadPath()
): Promise<void> => {
  return new Promise((resolve, reject) => {
    const fileStream = fs.createWriteStream(path.join(dir, fileName))
    // 500MB buffer size for writing
    const bufferSize = 500 * Math.pow(1024, 2)
    const iterations = Math.ceil(sizeInBytes / bufferSize)

    fileStream.on('open', (fd) => {
      let bytesWritten = 0
      for (let i = 0; i < iterations; i++) {
        const remainingBytes = sizeInBytes - bytesWritten
        const buffer = Buffer.alloc(remainingBytes < bufferSize ? remainingBytes : bufferSize)

        fs.writeSync(fd, buffer as any, 0, buffer.length, null)

        bytesWritten += buffer.length
      }
      fileStream.end()
    })

    fileStream.on('finish', () => resolve())

    fileStream.on('error', (err) => {
      reject(`An error occurred while writing file '${fileName}': ${err}`)
    })
  })
}

export const createFile = (
  fileName: string,
  content: string,
  dir: string = getTempUploadPath()
) => {
  fs.writeFileSync(path.join(dir, fileName), content)
}

export const removeTempUploadDirectory = () => {
  fs.rmSync(getWorkerTempPath(), { recursive: true, force: true })
}
