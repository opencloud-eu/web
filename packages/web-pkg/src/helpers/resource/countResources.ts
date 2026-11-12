import { isProjectSpaceResource, type Resource } from '@opencloud-eu/web-client'

export type ResourcesCount = {
  files: number
  hiddenFiles: number
  folders: number
  hiddenFolders: number
  spaces: number
}

export function countResources(resources: Resource[]): ResourcesCount {
  const count: ResourcesCount = {
    files: 0,
    hiddenFiles: 0,
    folders: 0,
    hiddenFolders: 0,
    spaces: 0
  }
  for (const resource of resources) {
    if (resource.type === 'file') {
      count.files++
      if (resource.name.startsWith('.')) {
        count.hiddenFiles++
      }
    } else if (resource.type === 'folder') {
      count.folders++
      if (resource.name.startsWith('.')) {
        count.hiddenFolders++
      }
    }
    if (isProjectSpaceResource(resource)) {
      count.spaces++
    }
  }
  return count
}
