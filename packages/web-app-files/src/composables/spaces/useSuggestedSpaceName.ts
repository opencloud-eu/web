import { useGettext } from 'vue3-gettext'
import { isProjectSpaceResource } from '@opencloud-eu/web-client'
import { resolveFileNameDuplicate, useSpacesStore } from '@opencloud-eu/web-pkg'

export const useSuggestedSpaceName = () => {
  const { $gettext } = useGettext()
  const spacesStore = useSpacesStore()

  // Spaces may share a name, so counting up is a suggestion, not a constraint.
  function getSuggestedSpaceName() {
    const suggestedName = $gettext('New space')
    const projectSpaces = spacesStore.spaces.filter(isProjectSpaceResource)
    if (!projectSpaces.some(({ name }) => name === suggestedName)) {
      return suggestedName
    }

    return resolveFileNameDuplicate(suggestedName, '', projectSpaces)
  }

  return { getSuggestedSpaceName }
}
