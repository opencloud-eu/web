import { useGettext } from 'vue3-gettext'
import {
  IncomingShareResource,
  isIncomingShareResource,
  isPersonalSpaceResource,
  isProjectSpaceResource,
  Resource,
  ShareTypes,
  SpaceResource
} from '@opencloud-eu/web-client'
import { useInterceptModifierClick } from '../keyboardActions'
import { useResourcesStore, useSideBar, useUserStore } from '../piniaStores'
import { IconFillType } from '../../helpers'

export type ResourceIndicatorCategory = 'system' | 'sharing' | 'space'

export interface ResourceIndicatorIcon {
  id: string
  accessibleDescription: string
  label: string
  icon: string
  fillType: IconFillType
  type: string
  category: ResourceIndicatorCategory
  handler?: (resource: Resource, event?: MouseEvent) => void
  kind: 'icon'
}

export interface ResourceIndicatorTag {
  id: string
  accessibleDescription: string
  label: string
  type: string
  category: ResourceIndicatorCategory
  class?: string
  kind: 'tag'
}

export type ResourceIndicator = ResourceIndicatorIcon | ResourceIndicatorTag

export const useResourceIndicators = () => {
  const { $gettext } = useGettext()
  const { interceptModifierClick } = useInterceptModifierClick()
  const { openSideBarPanel } = useSideBar()
  const resourcesStore = useResourcesStore()
  const userStore = useUserStore()

  const isUserShare = (shareTypes: number[]) => {
    return ShareTypes.containsAnyValue(ShareTypes.authenticated, shareTypes ?? [])
  }

  const isLinkShare = (shareTypes: number[]) => {
    return ShareTypes.containsAnyValue(ShareTypes.unauthenticated, shareTypes ?? [])
  }

  const shareUserIconDescribedBy = ({ isDirect }: { isDirect: boolean }) => {
    return isDirect
      ? $gettext('This item is directly shared with others.')
      : $gettext('This item is shared with others through one of the parent folders.')
  }

  const shareLinkDescribedBy = ({ isDirect }: { isDirect: boolean }) => {
    return isDirect
      ? $gettext('This item is directly shared via links.')
      : $gettext('This item is shared via links through one of the parent folders.')
  }

  const getUserIndicator = ({
    resource,
    isDirect
  }: {
    resource: Resource
    isDirect: boolean
  }): ResourceIndicator => {
    return {
      id: `files-sharing-${resource.getDomSelector()}`,
      kind: 'icon',
      accessibleDescription: shareUserIconDescribedBy({ isDirect }),
      label: $gettext('Show invited people'),
      icon: 'group',
      category: 'sharing',
      type: isDirect ? 'user-direct' : 'user-indirect',
      fillType: 'line',
      handler: (resource: Resource, event?: MouseEvent) => {
        if (event && interceptModifierClick(event, resource)) {
          return
        }

        openSideBarPanel('sharing')
      }
    }
  }

  const getSyncedIndicator = ({ resource }: { resource: Resource }): ResourceIndicator => {
    return {
      id: `files-sharing-synced-${resource.getDomSelector()}`,
      kind: 'icon',
      accessibleDescription: $gettext('This item is synced with your devices'),
      label: $gettext('Synced with your devices'),
      icon: 'loop-right',
      category: 'sharing',
      type: 'resource-synced',
      fillType: 'line'
    }
  }

  const getRoleIndicator = ({
    resource
  }: {
    resource: IncomingShareResource
  }): ResourceIndicator => {
    if (resource.shareRoles?.length) {
      return {
        id: `files-sharing-role-${resource.getDomSelector()}`,
        kind: 'icon',
        accessibleDescription: $gettext(resource.shareRoles[0].description),
        label: $gettext(resource.shareRoles[0].displayName),
        icon: resource.shareRoles[0].icon,
        category: 'sharing',
        type: 'share-role',
        fillType: 'line'
      }
    }

    return {
      id: `files-sharing-role-${resource.getDomSelector()}`,
      kind: 'icon',
      accessibleDescription: ShareTypes.remote.label,
      label: ShareTypes.remote.label,
      icon: ShareTypes.remote.icon,
      category: 'sharing',
      type: 'share-role',
      fillType: 'line'
    }
  }

  const getLinkIndicator = ({
    resource,
    isDirect
  }: {
    resource: Resource
    isDirect: boolean
  }): ResourceIndicator => {
    return {
      id: `file-link-${resource.getDomSelector()}`,
      kind: 'icon',
      accessibleDescription: shareLinkDescribedBy({ isDirect }),
      label: $gettext('Show links'),
      icon: 'link',
      category: 'sharing',
      type: isDirect ? 'link-direct' : 'link-indirect',
      fillType: 'line',
      handler: () => openSideBarPanel('sharing')
    }
  }

  const getLockedIndicator = ({ resource }: { resource: Resource }): ResourceIndicator => {
    return {
      id: `resource-locked-${resource.getDomSelector()}`,
      kind: 'icon',
      accessibleDescription: $gettext('Item locked'),
      label: $gettext('This item is locked'),
      icon: 'lock',
      category: 'system',
      type: 'resource-locked',
      fillType: 'line'
    }
  }

  const getProcessingIndicator = ({ resource }: { resource: Resource }): ResourceIndicator => {
    return {
      id: `resource-processing-${resource.getDomSelector()}`,
      kind: 'icon',
      accessibleDescription: $gettext('Item in processing'),
      label: $gettext('This item is in processing'),
      icon: 'loop-right',
      category: 'system',
      type: 'resource-processing',
      fillType: 'line'
    }
  }

  const getSpaceEnabledIndicator = ({ resource }: { resource: Resource }): ResourceIndicator => {
    return {
      id: `resource-space-enabled-${resource.getDomSelector()}`,
      kind: 'tag',
      accessibleDescription: $gettext('Space is enabled'),
      label: $gettext('Enabled'),
      category: 'space',
      type: 'resource-space-enabled',
      class: '!bg-green-200 !text-green-900'
    }
  }

  const getSpaceDisabledIndicator = ({ resource }: { resource: Resource }): ResourceIndicator => {
    return {
      id: `resource-space-disabled-${resource.getDomSelector()}`,
      kind: 'tag',
      accessibleDescription: $gettext('Space is disabled'),
      label: $gettext('Disabled'),
      category: 'space',
      type: 'resource-space-disabled',
      class: '!bg-red-200 !text-red-900'
    }
  }

  const getFavoriteIndicator = ({ resource }: { resource: Resource }): ResourceIndicator => {
    return {
      id: `resource-favorite-${resource.getDomSelector()}`,
      kind: 'icon',
      accessibleDescription: $gettext('This item is marked as favorite'),
      label: $gettext('Favorite'),
      icon: 'star',
      category: 'system',
      type: 'resource-favorite',
      fillType: 'line'
    }
  }

  const getIndicators = ({
    space,
    resource
  }: {
    space: SpaceResource
    resource: Resource
  }): ResourceIndicator[] => {
    const indicators: ResourceIndicator[] = []

    if (resource.starred) {
      indicators.push(getFavoriteIndicator({ resource }))
    }

    if (resource.locked) {
      indicators.push(getLockedIndicator({ resource }))
    }

    if (resource.processing) {
      indicators.push(getProcessingIndicator({ resource }))
    }

    if (isProjectSpaceResource(resource) && !resource.disabled) {
      indicators.push(getSpaceEnabledIndicator({ resource }))
    }

    if (isProjectSpaceResource(resource) && resource.disabled) {
      indicators.push(getSpaceDisabledIndicator({ resource }))
    }

    if (
      isIncomingShareResource(resource) &&
      (resource.shareTypes.includes(ShareTypes.remote.value) || resource.shareRoles?.length)
    ) {
      indicators.push(getRoleIndicator({ resource }))
    }

    if (isIncomingShareResource(resource) && resource.syncEnabled) {
      indicators.push(getSyncedIndicator({ resource }))
    }

    const shareIndicatorsAllowed =
      isProjectSpaceResource(space) ||
      (isPersonalSpaceResource(space) && space.isOwner(userStore.user))

    if (shareIndicatorsAllowed) {
      const ancestors = Object.values(resourcesStore.ancestorMetaData)
      const parentShareTypes = ancestors.flatMap(({ shareTypes }) => shareTypes)

      const isDirectUserShare = isUserShare(resource.shareTypes)
      if (isDirectUserShare || isUserShare(parentShareTypes)) {
        indicators.push(getUserIndicator({ resource, isDirect: isDirectUserShare }))
      }

      const isDirectLinkShare = isLinkShare(resource.shareTypes)
      if (isDirectLinkShare || isLinkShare(parentShareTypes)) {
        indicators.push(getLinkIndicator({ resource, isDirect: isDirectLinkShare }))
      }
    }

    return indicators
  }

  return { getIndicators }
}
