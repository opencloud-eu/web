import { SpaceResource } from '@opencloud-eu/web-client'
import { useClientService } from '../clientService'

export const useSpaceHelpers = () => {
  const clientService = useClientService()

  const getDefaultMetaFolder = async (space: SpaceResource) => {
    const { children } = await clientService.webdav.listFiles(space)
    return children.find(({ name }) => name === '.space')
  }

  return { getDefaultMetaFolder }
}
