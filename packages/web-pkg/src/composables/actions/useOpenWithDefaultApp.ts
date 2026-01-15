import { useFileActions } from './files'
import { Resource, SpaceResource } from '@opencloud-eu/web-client'

export function useOpenWithDefaultApp() {
  const { triggerDefaultAction } = useFileActions()

  const openWithDefaultApp = ({
    space,
    resource
  }: {
    space: SpaceResource
    resource: Resource
  }) => {
    if (!resource || resource.isFolder) {
      return
    }

    const fileActionsOptions = {
      resources: [resource],
      space: space
    }
    triggerDefaultAction({ ...fileActionsOptions, omitSystemActions: true })
  }

  return { openWithDefaultApp }
}
