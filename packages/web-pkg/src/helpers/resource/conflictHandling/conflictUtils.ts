import { dirname } from 'path'
import { Resource, SpaceResource } from '@opencloud-eu/web-client'
import { withoutExtension } from '../../fileExtension'

export const resolveFileNameDuplicate = (
  name: string,
  extension: string,
  existingResources: Resource[],
  iteration = 1
): string => {
  const nameWithoutExtension = extension ? withoutExtension(name, extension) : name
  // dot files like ".env" and names not ending with the extension get the suffix appended
  const potentialName =
    nameWithoutExtension && nameWithoutExtension !== name
      ? `${nameWithoutExtension} (${iteration}).${extension}`
      : `${name} (${iteration})`
  const hasConflict = existingResources.some((f) => f.name === potentialName)
  if (!hasConflict) {
    return potentialName
  }
  return resolveFileNameDuplicate(name, extension, existingResources, iteration + 1)
}

export const isResourceBeeingMovedToSameLocation = (
  sourceSpace: SpaceResource,
  resource: Resource,
  targetSpace: SpaceResource,
  targetFolder: Resource
) => {
  return sourceSpace.id === targetSpace.id && dirname(resource.path) === targetFolder.path
}
