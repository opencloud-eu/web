import { Resource } from '@opencloud-eu/web-client'
import { useGettext } from 'vue3-gettext'
import { RESOURCE_NAME_MAX_BYTES } from '../../../constants'
import { useResourcesStore } from '../../piniaStores'

export const useIsResourceNameValid = () => {
  const { $gettext } = useGettext()
  const resourcesStore = useResourcesStore()

  const isFileNameValid = (
    resource: Resource,
    newName: string,
    parentResources: Resource[] = undefined
  ): { isValid: boolean; error?: string } => {
    if (!newName) {
      return { isValid: false, error: $gettext('The name cannot be empty') }
    }

    if (/[/]/.test(newName)) {
      return { isValid: false, error: $gettext('The name cannot contain "/"') }
    }

    if (newName === '.') {
      return { isValid: false, error: $gettext('The name cannot be equal to "."') }
    }

    if (newName === '..') {
      return { isValid: false, error: $gettext('The name cannot be equal to ".."') }
    }

    if (newName.trim() !== newName) {
      return { isValid: false, error: $gettext('The name cannot start or end with whitespace') }
    }

    const newNameBytes = new TextEncoder().encode(newName).length
    if (newNameBytes > RESOURCE_NAME_MAX_BYTES) {
      return {
        isValid: false,
        error: $gettext('The name is too long')
      }
    }

    const newPath =
      resource.path.substring(0, resource.path.length - resource.name.length) + newName
    const exists = (parentResources || resourcesStore.resources).some(
      (file) => file.path === newPath && file.name === newName
    )
    if (exists) {
      const translated = $gettext('The name »%{name}« is already taken')
      return { isValid: false, error: $gettext(translated, { name: newName }, true) }
    }

    return { isValid: true, error: undefined }
  }

  const isSpaceNameValid = (newName: string): { isValid: boolean; error?: string } => {
    if (newName.trim() === '') {
      return {
        isValid: false,
        error: $gettext('The Space name cannot be empty')
      }
    }

    const newNameBytes = new TextEncoder().encode(newName).length
    if (newNameBytes > RESOURCE_NAME_MAX_BYTES) {
      return {
        isValid: false,
        error: $gettext('The Space name is too long')
      }
    }

    if (newName.trim() !== newName) {
      return {
        isValid: false,
        error: $gettext('The Space name cannot start or end with whitespace')
      }
    }

    if (/[/\\.:?*"><|]/.test(newName)) {
      return {
        isValid: false,
        error: $gettext(
          'The Space name cannot contain the following characters: / \\\\ . : ? * " > < |\''
        )
      }
    }

    return { isValid: true, error: undefined }
  }

  return {
    isSpaceNameValid,
    isFileNameValid
  }
}
