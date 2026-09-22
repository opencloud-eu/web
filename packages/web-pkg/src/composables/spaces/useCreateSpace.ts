import { extractStorageId, Resource, ShareTypes, SpaceResource } from '@opencloud-eu/web-client'
import PQueue from 'p-queue'
import { useClientService } from '../clientService'
import {
  useConfigStore,
  useExtensionRegistry,
  useMessages,
  useResourcesStore,
  useSharesStore,
  useSpacesStore
} from '../piniaStores'
import { useGettext } from 'vue3-gettext'
import { getVaultCreator } from '../../helpers'
import { eventBus } from '../../services'
import type { VaultFinalize } from '../piniaStores'
import { useSpaceHelpers } from './useSpaceHelpers'

export interface SpaceMemberInvite {
  id: string
  displayName: string
  shareType: number
  roleId: string
}

export interface AddNewSpaceOptions {
  encrypt?: boolean
  finalizeVault?: VaultFinalize
  quota?: number
  subtitle?: string
  description?: string
  image?: ArrayBuffer
  members?: SpaceMemberInvite[]
}

export const useCreateSpace = () => {
  const clientService = useClientService()
  const configStore = useConfigStore()
  const resourcesStore = useResourcesStore()
  const { $gettext } = useGettext()
  const spacesStore = useSpacesStore()
  const sharesStore = useSharesStore()
  const extensionRegistry = useExtensionRegistry()
  const { upsertResource } = resourcesStore
  const { showMessage, showErrorMessage } = useMessages()
  const { getDefaultMetaFolder } = useSpaceHelpers()

  /**
   * `vaultContentType` turns the new space into an end-to-end encrypted one: it
   * lands in the drive's `@libre.graph.contentType`. Such a space must not get the
   * default template, or the server would create a `.space` folder.
   */
  const createSpace = (
    name: string,
    { vaultContentType, subtitle }: { vaultContentType?: string; subtitle?: string } = {}
  ) => {
    const { graphAuthenticated } = clientService
    return graphAuthenticated.drives.createDrive(
      {
        name,
        ...(subtitle && { description: subtitle }),
        ...(vaultContentType && { '@libre.graph.contentType': vaultContentType })
      },
      { params: { template: vaultContentType ? 'none' : 'default' } }
    )
  }

  const createDefaultMetaFolder = async (space: SpaceResource) => {
    const spaceFolder = await clientService.webdav.createFolder(space, { path: '.space' })
    if (extractStorageId(spaceFolder.parentFolderId) === resourcesStore.currentFolder?.id) {
      resourcesStore.upsertResource(spaceFolder)
    }

    return spaceFolder
  }

  async function getOrCreateMetaFolder(space: SpaceResource) {
    return (await getDefaultMetaFolder(space)) || (await createDefaultMetaFolder(space))
  }

  async function applyQuota(space: SpaceResource, quota: number) {
    const updatedSpace = await clientService.graphAuthenticated.drives.updateDrive(space.id, {
      name: space.name,
      quota: { total: quota }
    })
    spacesStore.updateSpaceField({
      id: space.id,
      field: 'spaceQuota',
      value: updatedSpace.spaceQuota
    })
  }

  /** Throws, so the caller decides how to report a failure. */
  async function setSpaceReadme(
    space: SpaceResource,
    content: string,
    { metaFolder }: { metaFolder?: Resource } = {}
  ) {
    const folder = metaFolder || (await getOrCreateMetaFolder(space))
    const readme = await clientService.webdav.putFileContents(space, {
      parentFolderId: folder.id,
      fileName: 'readme.md',
      content,
      overwrite: true
    })
    const updatedSpace = await clientService.graphAuthenticated.drives.updateDrive(space.id, {
      name: space.name,
      special: [{ specialFolder: { name: 'readme' }, id: readme.id }]
    })
    spacesStore.updateSpaceField({
      id: space.id,
      field: 'spaceReadmeData',
      value: updatedSpace.spaceReadmeData
    })

    return readme
  }

  /** Throws, so the caller decides how to report a failure. */
  async function setSpaceImage(
    space: SpaceResource,
    content: ArrayBuffer,
    { metaFolder }: { metaFolder?: Resource } = {}
  ) {
    spacesStore.addToImagesLoading(space.id)

    try {
      const folder = metaFolder || (await getOrCreateMetaFolder(space))
      const { fileId, processing } = await clientService.webdav.putFileContents(space, {
        parentFolderId: folder.id,
        fileName: 'image.png',
        content,
        headers: { 'Content-Type': 'application/offset+octet-stream' },
        overwrite: true
      })
      const updatedSpace = await clientService.graphAuthenticated.drives.updateDrive(space.id, {
        name: space.name,
        special: [{ specialFolder: { name: 'image' }, id: fileId }]
      })

      if (!processing) {
        spacesStore.removeFromImagesLoading(space.id)
      }

      spacesStore.updateSpaceField({
        id: space.id,
        field: 'spaceImageData',
        value: updatedSpace.spaceImageData
      })

      // Nothing fetches the preview on its own - the space list only knows to
      // load it once this went out.
      eventBus.publish('app.files.spaces.uploaded-image', updatedSpace)
    } catch (error) {
      spacesStore.removeFromImagesLoading(space.id)
      throw error
    }
  }

  /**
   * Invites all members and reports back the ones that could not be added, so the
   * caller can name them in the summary instead of failing the whole creation.
   */
  async function applyMembers(space: SpaceResource, members: SpaceMemberInvite[]) {
    const failed: string[] = []
    // Same budget every other invite path uses - a long member list must not
    // fire one request per member at once.
    const queue = new PQueue({ concurrency: configStore.options.concurrentRequests.shares.create })

    await queue.addAll(
      members.map(({ id, displayName, shareType, roleId }) => async () => {
        try {
          await clientService.graphAuthenticated.permissions.createInvite(
            space.id,
            space.id,
            {
              roles: [roleId],
              recipients: [
                {
                  objectId: id,
                  '@libre.graph.recipient.type':
                    shareType === ShareTypes.group.value ? 'group' : 'user'
                }
              ]
            },
            sharesStore.graphRoles
          )
        } catch (error) {
          console.error(error)
          failed.push(displayName)
        }
      })
    )

    return failed
  }

  /**
   * Runs one step of the creation on its own: a failure only adds its message to
   * the summary, because a space that exists must not be rolled back just
   * because e.g. its image didn't make it.
   */
  async function runStep(failures: string[], message: string, step: () => Promise<unknown>) {
    try {
      await step()
    } catch (error) {
      console.error(error)
      failures.push(message)
    }
  }

  async function applyOptions(space: SpaceResource, options: AddNewSpaceOptions) {
    const { quota, description, image, members = [] } = options
    const failures: string[] = []

    if (quota) {
      await runStep(failures, $gettext('The quota could not be set.'), () =>
        applyQuota(space, quota)
      )
    }

    // A vault space is encrypted all the way down, so a readme or an image
    // would sit there as plain text next to the encrypted files.
    if (!options.encrypt && (description || image)) {
      const metaFolder = getOrCreateMetaFolder(space)

      if (description) {
        await runStep(failures, $gettext('The description could not be saved.'), async () =>
          setSpaceReadme(space, description, { metaFolder: await metaFolder })
        )
      }

      if (image) {
        await runStep(failures, $gettext('The image could not be uploaded.'), async () =>
          setSpaceImage(space, image, { metaFolder: await metaFolder })
        )
      }
    }

    if (members.length) {
      const failedMembers = await applyMembers(space, members)
      if (failedMembers.length) {
        failures.push(
          $gettext('These members could not be added: %{members}.', {
            members: failedMembers.join(', ')
          })
        )
      }
    }

    return failures
  }

  const addNewSpace = async (name: string, options: AddNewSpaceOptions = {}) => {
    const { encrypt = false, finalizeVault, subtitle } = options

    let createdSpace: SpaceResource
    try {
      const creation = getVaultCreator(extensionRegistry)?.creation
      if (encrypt && !creation) {
        // Better to fail loudly than to hand back an unencrypted space to
        // someone who asked for an encrypted one.
        throw new Error('no vault scheme available to create an encrypted space')
      }
      createdSpace = await createSpace(name, {
        vaultContentType: encrypt ? creation.vaultContentType : undefined,
        subtitle
      })
    } catch (error) {
      console.error(error)
      showErrorMessage({
        title: $gettext('Creating space failed…'),
        errors: [error]
      })
      return
    }

    upsertResource(createdSpace)
    spacesStore.upsertSpace(createdSpace)

    const failures: string[] = []

    if (encrypt && finalizeVault) {
      // A vault space is encrypted all the way down, so its vault root is the
      // space root.
      await runStep(failures, $gettext('The password was not saved.'), () =>
        finalizeVault(createdSpace, '/')
      )
    }

    failures.push(...(await applyOptions(createdSpace, options)))

    if (options.members?.length) {
      // Member grants live on the drive root, so the space in the store only
      // knows about them after a re-read.
      try {
        const updatedSpace = await clientService.graphAuthenticated.drives.getDrive(createdSpace.id)
        upsertResource(updatedSpace)
        spacesStore.upsertSpace(updatedSpace)
      } catch (error) {
        console.error(error)
      }
    }

    if (failures.length) {
      showMessage({
        title: $gettext('Space was created'),
        desc: failures.join(' '),
        status: 'warning',
        timeout: 0
      })
      return createdSpace
    }

    showMessage({ title: $gettext('Space was created successfully') })
    return createdSpace
  }

  return {
    createSpace,
    createDefaultMetaFolder,
    getOrCreateMetaFolder,
    setSpaceImage,
    setSpaceReadme,
    addNewSpace
  }
}
