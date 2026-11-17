import { dirname } from 'path'
import { Resource, SpaceResource } from '@opencloud-eu/web-client'
import { RESOURCE_NAME_MAX_BYTES } from '../../../constants'
import { withoutExtension } from '../../fileExtension'
import { getTextByteSize } from '../../textByteSize'

/**
 * Shortens the base from the end so that base and suffix together fit into the max name bytes.
 * Cuts on grapheme boundaries so no multi-byte character or emoji sequence gets split.
 */
function fitBaseToMaxBytes(base: string, suffix: string): string {
  const maxBaseBytes = RESOURCE_NAME_MAX_BYTES - getTextByteSize(suffix)
  if (getTextByteSize(base) <= maxBaseBytes) {
    return base
  }

  let shortenedBase = ''
  let bytes = 0
  const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' })
  for (const { segment } of segmenter.segment(base)) {
    bytes += getTextByteSize(segment)
    if (bytes > maxBaseBytes) {
      break
    }
    shortenedBase += segment
  }
  return shortenedBase.trimEnd()
}

function getDuplicateName(name: string, extension: string, iteration: number): string {
  const nameWithoutExtension = extension ? withoutExtension(name, extension) : name
  // dot files like ".env" and names not ending with the extension get the suffix appended
  if (nameWithoutExtension && nameWithoutExtension !== name) {
    const suffix = ` (${iteration}).${extension}`
    const base = fitBaseToMaxBytes(nameWithoutExtension, suffix)
    // with an extension too long to keep any of the base, the whole name gets shortened instead
    if (base) {
      return `${base}${suffix}`
    }
  }

  const suffix = ` (${iteration})`
  return `${fitBaseToMaxBytes(name, suffix)}${suffix}`
}

export const resolveFileNameDuplicate = (
  name: string,
  extension: string,
  existingResources: Pick<Resource, 'name'>[],
  iteration = 1
): string => {
  const potentialName = getDuplicateName(name, extension, iteration)
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
