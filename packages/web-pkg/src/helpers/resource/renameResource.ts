import {
  Resource,
  SpaceResource,
  extractExtensionFromFile,
  basename,
  urlJoin
} from '@opencloud-eu/web-client'

export function renameResource(space: SpaceResource, resource: Resource, newPath: string) {
  resource.name = basename(newPath)
  resource.path = newPath
  resource.webDavPath = urlJoin(space.webDavPath, newPath)
  resource.extension = extractExtensionFromFile(resource)
  return resource
}
