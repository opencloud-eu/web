import { readFileSync, lstatSync, readdirSync } from 'fs'
import { Page } from '@playwright/test'

interface File {
  name: string
  path: string
}

interface FileBuffer {
  name: string
  bufferString: string
  relativePath: string
}

const getFiles = (resources: File[], files: FileBuffer[] = [], parent = ''): FileBuffer[] => {
  for (const resource of resources) {
    const filePath = parent ? `${parent}/${resource.name}` : resource.name
    const stat = lstatSync(resource.path)
    if (stat.isFile()) {
      files.push({
        name: resource.name,
        bufferString: JSON.stringify(Array.from(readFileSync(resource.path))),
        relativePath: filePath
      })
    } else if (stat.isDirectory()) {
      const entries = readdirSync(resource.path)
      const subResources: File[] = entries.map((entry) => ({
        path: `${resource.path}/${entry}`,
        name: entry
      }))
      getFiles(subResources, files, filePath)
    }
  }
  return files
}

export const dragDropFiles = async (page: Page, resources: File[], targetSelector: string) => {
  const files = getFiles(resources)

  await page.evaluate(
    ([files, selector]: [FileBuffer[], string]) => {
      const dataTransfer = new DataTransfer()

      for (const file of files) {
        const buffer = new Uint8Array(JSON.parse(file.bufferString))
        const blob = new Blob([buffer])
        const fileObj = new File([blob], file.name)

        if (file.relativePath.includes('/')) {
          Object.defineProperty(fileObj, 'webkitRelativePath', {
            value: file.relativePath
          })
        }

        dataTransfer.items.add(fileObj)
      }
      const target = document.querySelector(selector)
      if (!target) throw new Error(`Target ${selector} not found`)
      const dragEnter = new DragEvent('dragenter', { dataTransfer, bubbles: true })
      const dragOver = new DragEvent('dragover', { dataTransfer, bubbles: true })
      const drop = new DragEvent('drop', { dataTransfer, bubbles: true })

      target.dispatchEvent(dragEnter)
      target.dispatchEvent(dragOver)
      target.dispatchEvent(drop)
    },
    [files, targetSelector]
  )
}
