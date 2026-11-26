import {
  Resource,
  SpaceResource,
  dirname,
  extractExtensionFromFile
} from '@opencloud-eu/web-client'
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
  existingResources: Pick<Resource, 'name'>[] | ReadonlySet<string>,
  iteration = 1
): string => {
  const existingNames = Array.isArray(existingResources)
    ? new Set(existingResources.map((r) => r.name))
    : existingResources
  const nameWithoutExtension = extension ? withoutExtension(name, extension) : name
  // dot files like ".env" and names not ending with the extension get the suffix appended
  const hasExtension = nameWithoutExtension && nameWithoutExtension !== name
  for (; ; iteration++) {
    const potentialName = hasExtension
      ? fitToMaxBytes(nameWithoutExtension, ` (${iteration}).${extension}`)
      : fitToMaxBytes(name, ` (${iteration})`)
    if (!existingNames.has(potentialName)) {
      return potentialName
    }
  }
}

/**
 * Extension a numbered duplicate of the resource keeps after its counter. A folder has
 * none, the text after its last dot is part of its name - except for a vault root,
 * whose extension marks it as a vault.
 */
export function getDuplicateExtension(resource: Resource, isVaultRoot = false): string {
  if (resource.type === 'folder' && !isVaultRoot) {
    return ''
  }
  return extractExtensionFromFile(resource)
}

export const isResourceBeeingMovedToSameLocation = (
  sourceSpace: SpaceResource,
  resource: Resource,
  targetSpace: SpaceResource,
  targetFolder: Resource
) => {
  return sourceSpace.id === targetSpace.id && dirname(resource.path) === targetFolder.path
}
