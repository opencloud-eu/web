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
    ([files, selector]) => {
      const target = document.querySelector(selector as string)
      if (!target) throw new Error(`Target ${selector} not found`)
      const input = document.createElement('input')
      input.type = 'file'
      input.multiple = true
      input.style.display = 'none'
      input.webkitdirectory = (files as FileBuffer[]).some((f) => f.relativePath.includes('/'))
      document.body.appendChild(input)

      const dt = new DataTransfer()
      ;(files as FileBuffer[]).forEach((file) => {
        const buffer = new Uint8Array(JSON.parse(file.bufferString))
        const fileObj = new File([new Blob([buffer])], file.name)
        if (file.relativePath.includes('/')) {
          Object.defineProperty(fileObj, 'webkitRelativePath', { value: file.relativePath })
        }
        dt.items.add(fileObj)
      })
      input.files = dt.files

      const dropEvent = new Event('drop', { bubbles: true })
      Object.defineProperty(dropEvent, 'dataTransfer', {
        value: { files: dt.files, types: ['Files'] }
      })
      target.dispatchEvent(dropEvent)
      document.body.removeChild(input)
    },
    [files, targetSelector]
  )
}
