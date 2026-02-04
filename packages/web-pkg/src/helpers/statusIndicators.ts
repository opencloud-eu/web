import { Resource, SpaceResource } from '@opencloud-eu/web-client'
import { AncestorMetaData } from '../types'
import { User } from '@opencloud-eu/web-client/graph/generated'
import { useInterceptModifierClick, ResourceIndicator, useResourceIndicators } from '../composables'

/** @deprecated use `useResourceIndicators` instead. make sure to call this with injection context. */
export const getIndicators = ({
  space,
  resource
}: {
  space: SpaceResource
  resource: Resource
  ancestorMetaData: AncestorMetaData
  user: User
  interceptModifierClick: ReturnType<typeof useInterceptModifierClick>['interceptModifierClick']
}): ResourceIndicator[] => {
  const { getIndicators: getIndicatorsFromComposable } = useResourceIndicators()
  return getIndicatorsFromComposable({ space, resource })
}
