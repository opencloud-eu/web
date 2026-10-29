import { Resource, SpaceResource } from '@opencloud-eu/web-client'
import { useGettext } from 'vue3-gettext'
import { RESOURCE_NAME_MAX_BYTES } from '../../constants'
import { useExtensionRegistry, useResourcesStore } from '../piniaStores'
import { getTextByteSize, getVaultNameMaxBytes } from '../../helpers'

export const useIsResourceNameValid = () => {
  const { $gettext } = useGettext()
  const resourcesStore = useResourcesStore()
  const extensionRegistry = useExtensionRegistry()

  const isFileNameValid = (
    resource: Resource,
    newName: string,
    parentResources: Resource[] = undefined,
    space: SpaceResource = undefined
  ): { isValid: boolean; error?: string } => {
    if (!newName) {
      return { isValid: false, error: $gettext('The name cannot be empty') }
    }

    if (/[/]/.test(newName)) {
      return { isValid: false, error: $gettext('The name cannot contain "/"') }
    }

    if (/[\\]/.test(newName)) {
      return { isValid: false, error: $gettext('The name cannot contain "\\"') }
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

    if (getTextByteSize(newName) > RESOURCE_NAME_MAX_BYTES) {
      return {
        isValid: false,
        error: $gettext('The name is too long')
      }
    }

    const parentPath = resource.path.substring(0, resource.path.length - resource.name.length)
    const newPath = parentPath + newName

    const vaultNameMaxBytes = getVaultNameMaxBytes(extensionRegistry, space, parentPath)
    if (vaultNameMaxBytes && getTextByteSize(newName) > vaultNameMaxBytes) {
      return {
        isValid: false,
        error: $gettext('The name is too long for an encrypted folder')
      }
    }

    const exists = (parentResources || resourcesStore.resources).some(
      (file) => file.path === newPath && file.name === newName
    )
    if (exists) {
      const translated = $gettext('The name »%{name}« is already taken')
      return { isValid: false, error: $gettext(translated, { name: newName }) }
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

    if (getTextByteSize(newName) > RESOURCE_NAME_MAX_BYTES) {
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
