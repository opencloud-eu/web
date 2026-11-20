import { Resource, SpaceResource, dirname } from '@opencloud-eu/web-client'
import { RESOURCE_NAME_MAX_BYTES } from '../../../constants'
import { withoutExtension } from '../../fileExtension'
import { getTextByteSize } from '../../textByteSize'

// cuts the base by whole code points so base and suffix fit into the max name bytes
function fitToMaxBytes(base: string, suffix: string): string {
  if (getTextByteSize(base + suffix) <= RESOURCE_NAME_MAX_BYTES) {
    return base + suffix
  }
  const chars = Array.from(base)
  while (chars.length && getTextByteSize(chars.join('') + suffix) > RESOURCE_NAME_MAX_BYTES) {
    chars.pop()
  }
  return chars.join('').trimEnd() + suffix
}

export const resolveFileNameDuplicate = (
  name: string,
  extension: string,
  existingResources: Pick<Resource, 'name'>[],
  iteration = 1
): string => {
  const nameWithoutExtension = extension ? withoutExtension(name, extension) : name
  // dot files like ".env" and names not ending with the extension get the suffix appended
  const potentialName =
    nameWithoutExtension && nameWithoutExtension !== name
      ? fitToMaxBytes(nameWithoutExtension, ` (${iteration}).${extension}`)
      : fitToMaxBytes(name, ` (${iteration})`)
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
