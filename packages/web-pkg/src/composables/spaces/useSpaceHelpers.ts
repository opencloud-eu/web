import { SpaceResource } from '@opencloud-eu/web-client'
import { useGettext } from 'vue3-gettext'
import { useClientService } from '../clientService'
import { RESOURCE_MAX_CHARACTER_LENGTH } from '../../constants'

export const useSpaceHelpers = () => {
  const { $gettext } = useGettext()
  const clientService = useClientService()

  const checkSpaceNameModalInput = (name: string, setError: (value: string) => void) => {
    if (name.trim() === '') {
      return setError($gettext('Space name cannot be empty'))
    }

    if (name.length > RESOURCE_MAX_CHARACTER_LENGTH) {
      return setError(
        $gettext('Space name cannot be longer than %{length} characters', {
          length: RESOURCE_MAX_CHARACTER_LENGTH.toString()
        })
      )
    }

    if (/[/\\.:?*"><|]/.test(name)) {
      return setError(
        $gettext('Space name cannot contain the following characters: / \\\\ . : ? * " > < |\'')
      )
    }
    return setError(null)
  }

  const getDefaultMetaFolder = async (space: SpaceResource) => {
    const { children } = await clientService.webdav.listFiles(space)
    return children.find(({ name }) => name === '.space')
  }

  return { checkSpaceNameModalInput, getDefaultMetaFolder }
}
