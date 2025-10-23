import Uppy, { State, UnknownPlugin } from '@uppy/core'
import { HandleUpload } from '../../src/HandleUpload'
import { mock, mockDeep } from 'vitest-mock-extended'
import { Resource, SpaceResource } from '@opencloud-eu/web-client'
import { RouteLocationNormalizedLoaded } from 'vue-router'
import { computed, ref, unref } from 'vue'
import {
  ClientService,
  UppyService,
  locationSpacesGeneric,
  useUserStore,
  useMessages,
  useSpacesStore,
  useResourcesStore,
  OcUppyFile,
  OcUppyMeta,
  OcUppyBody
} from '@opencloud-eu/web-pkg'
import { Language } from 'vue3-gettext'
import { createTestingPinia } from '@opencloud-eu/web-test-helpers'

let getConflictsMock = vi.fn()
let displayOverwriteDialogMock = vi.fn()

vi.mock('../../src/helpers/resource/actions', () => {
  const UploadResourceConflict = vi.fn(
    class {
      getConflicts = getConflictsMock
      displayOverwriteDialog = displayOverwriteDialogMock
    }
  )
  return { UploadResourceConflict }
})

type UppyPlugin = UnknownPlugin<OcUppyMeta, OcUppyBody, Record<string, unknown>>

describe('HandleUpload', () => {
  it('installs the handleUpload callback when files are being added', () => {
    const { instance, mocks } = getWrapper()
    instance.install()
    expect(mocks.uppy.on).toHaveBeenCalledWith('files-added', instance.handleUpload)
  })
  it('uninstalls the handleUpload callback when files are being added', () => {
    const { instance, mocks } = getWrapper()
    instance.uninstall()
    expect(mocks.uppy.off).toHaveBeenCalledWith('files-added', instance.handleUpload)
  })
  it('removes files from the uppy upload queue', () => {
    const { instance, mocks } = getWrapper()
    const fileToRemove = mock<OcUppyFile>()
    instance.removeFilesFromUpload([fileToRemove])
    expect(mocks.uppy.removeFile).toHaveBeenCalledWith(fileToRemove.id)
  })
  describe('method prepareFiles', () => {
    it('correctly prepares all files that need to be uploaded', () => {
      const { instance, mocks } = getWrapper()
      mocks.uppy.getPlugin.mockReturnValue(mock<UppyPlugin>())
      const fileToUpload = mock<OcUppyFile>({ name: 'name' })
      const uploadFolder = mock<Resource>({ id: '1', path: '/' })
      const processedFiles = instance.prepareFiles([fileToUpload], uploadFolder)

      const route = unref(mocks.opts.route)

      expect(processedFiles[0].tus.endpoint).toEqual('/')
      expect(processedFiles[0].meta.name).toEqual(fileToUpload.name)
      expect(processedFiles[0].meta.spaceId).toEqual(unref(mocks.opts.space).id)
      expect(processedFiles[0].meta.spaceName).toEqual(unref(mocks.opts.space).name)
      expect(processedFiles[0].meta.driveAlias).toEqual(unref(mocks.opts.space).driveAlias)
      expect(processedFiles[0].meta.driveType).toEqual(unref(mocks.opts.space).driveType)
      expect(processedFiles[0].meta.currentFolder).toEqual(uploadFolder.path)
      expect(processedFiles[0].meta.currentFolderId).toEqual(uploadFolder.id)
      expect(processedFiles[0].meta.tusEndpoint).toEqual(uploadFolder.path)
      expect(processedFiles[0].meta.relativeFolder).toEqual('')
      expect(processedFiles[0].meta.routeName).toEqual(route.name)
      expect(processedFiles[0].meta.routeDriveAliasAndItem).toEqual(route.params.driveAliasAndItem)
      expect(processedFiles[0].meta.routeShareId).toEqual(route.query.shareId)
    })
    it('includes the folder name in the "relativeFolder" prop for folder files', () => {
      const { instance, mocks } = getWrapper()
      mocks.uppy.getPlugin.mockReturnValue(mock<UppyPlugin>())
      const fileToUpload = mock<OcUppyFile>({ name: 'name', type: 'directory' })
      const uploadFolder = mock<Resource>({ id: '1', path: '/' })
      const processedFiles = instance.prepareFiles([fileToUpload], uploadFolder)

      expect(processedFiles[0].meta.relativeFolder).toEqual(`/${fileToUpload.name}`)
    })
  })
  describe('method createDirectoryTree', () => {
    it('creates a directory for a single file with a relative folder given', async () => {
      const { instance, mocks } = getWrapper()
      mocks.uppy.getPlugin.mockReturnValue(mock<UppyPlugin>())
      const relativeFolder = '/relativeFolder'
      const fileToUpload = mock<OcUppyFile>({ name: 'name', meta: { relativeFolder } })
      const createdFolder = mock<Resource>()
      mocks.opts.clientService.webdav.createFolder.mockResolvedValue(createdFolder)

      const uploadFolder = mock<Resource>({ id: '1', path: '/' })
      const { filesToUpload } = await instance.createDirectoryTree([fileToUpload], uploadFolder)

      expect(mocks.opts.uppyService.publish).toHaveBeenCalledWith(
        'uploadSuccess',
        expect.objectContaining({
          name: relativeFolder.split('/')[1],
          type: 'folder',
          meta: expect.objectContaining({
            spaceId: unref(mocks.opts.space).id,
            spaceName: unref(mocks.opts.space).name,
            driveAlias: unref(mocks.opts.space).driveAlias,
            driveType: unref(mocks.opts.space).driveType,
            currentFolder: uploadFolder.path,
            currentFolderId: uploadFolder.id,
            relativeFolder: '',
            routeName: fileToUpload.meta.routeName,
            routeDriveAliasAndItem: fileToUpload.meta.routeDriveAliasAndItem,
            routeShareId: fileToUpload.meta.routeShareId,
            fileId: createdFolder.fileId,
            isFolder: true
          })
        })
      )
      expect(mocks.opts.clientService.webdav.createFolder).toHaveBeenCalledTimes(1)
      expect(mocks.opts.clientService.webdav.createFolder).toHaveBeenCalledWith(
        unref(mocks.opts.space),
        {
          path: relativeFolder,
          fetchFolder: true
        }
      )
      expect(filesToUpload.length).toBe(1)
    })
    it('filters out files whose folders could not be created', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined)

      const { instance, mocks } = getWrapper()
      mocks.uppy.getPlugin.mockReturnValue(mock<UppyPlugin>())
      const relativeFolder = '/relativeFolder'
      const fileToUpload = mock<OcUppyFile>({ name: 'name', meta: { relativeFolder } })
      mocks.opts.clientService.webdav.createFolder.mockRejectedValue({})

      const { filesToUpload } = await instance.createDirectoryTree([fileToUpload], mock<Resource>())

      expect(mocks.opts.uppyService.publish).toHaveBeenCalledWith('uploadError', expect.anything())
      expect(mocks.uppy.removeFile).toHaveBeenCalled()
      expect(filesToUpload.length).toBe(0)
    })
    it('returns folder files and removes them from the uppy upload files', async () => {
      const { instance, mocks } = getWrapper()
      mocks.uppy.getPlugin.mockReturnValue(mock<UppyPlugin>())
      const relativeFolder = '/relativeFolder'
      const fileToUpload = mock<OcUppyFile>({
        name: 'directory',
        type: 'directory',
        meta: { relativeFolder }
      })
      const createdFolder = mock<Resource>()
      mocks.opts.clientService.webdav.createFolder.mockResolvedValue(createdFolder)

      const uploadFolder = mock<Resource>({ id: '1', path: '/' })
      const { filesToUpload, folderFiles } = await instance.createDirectoryTree(
        [fileToUpload],
        uploadFolder
      )

      expect(instance.uppy.removeFile).toHaveBeenCalled()
      expect(mocks.opts.clientService.webdav.createFolder).toHaveBeenCalledTimes(1)
      expect(filesToUpload.length).toBe(0)
      expect(folderFiles.length).toBe(1)
    })
  })
  describe('method handleUpload', () => {
    it('prepares files and eventually triggers the upload in uppy', async () => {
      const { instance, mocks } = getWrapper()
      const prepareFilesSpy = vi.spyOn(instance, 'prepareFiles')
      await instance.handleUpload([mock<OcUppyFile>({ name: 'name' })])
      expect(prepareFilesSpy).toHaveBeenCalledTimes(1)
      expect(mocks.opts.uppyService.publish).toHaveBeenCalledWith(
        'addedForUpload',
        expect.anything()
      )
      expect(mocks.opts.uppyService.uploadFiles).toHaveBeenCalledTimes(1)
    })
    describe('quota check', () => {
      it('checks quota if check enabled', async () => {
        const { instance } = getWrapper()
        const checkQuotaExceededSpy = vi.spyOn(instance, 'checkQuotaExceeded')
        await instance.handleUpload([mock<OcUppyFile>({ name: 'name' })])
        expect(checkQuotaExceededSpy).toHaveBeenCalled()
      })
      it('does not check quota if check disabled', async () => {
        const { instance } = getWrapper({ quotaCheckEnabled: false })
        const checkQuotaExceededSpy = vi.spyOn(instance, 'checkQuotaExceeded')
        await instance.handleUpload([mock<OcUppyFile>({ name: 'name' })])
        expect(checkQuotaExceededSpy).not.toHaveBeenCalled()
      })
      it.each([
        { size: 100, remaining: 90, driveType: 'project', quotaExceeded: true },
        { size: 10, remaining: 90, driveType: 'project', quotaExceeded: false },
        { size: 100, remaining: 90, driveType: 'personal', quotaExceeded: true },
        { size: 10, remaining: 90, driveType: 'personal', quotaExceeded: false }
      ])(
        'returns a correct result after quota has been checked for own personal and project spaces',
        ({ size, remaining, driveType, quotaExceeded }) => {
          const space = mock<SpaceResource>({
            driveType,
            id: '1',
            spaceQuota: { remaining },
            isOwner: () => true
          })
          const { instance } = getWrapper({ spaces: [space] })
          const result = instance.checkQuotaExceeded([
            mock<OcUppyFile>({
              name: 'name',
              meta: { spaceId: '1', routeName: locationSpacesGeneric.name as string },
              data: { size } as Blob
            })
          ])
          expect(result).toBe(quotaExceeded)
        }
      )
      it('does not check quota for share spaces', () => {
        const size = 100
        const remaining = 90
        const space = mock<SpaceResource>({
          driveType: 'share',
          id: '1',
          spaceQuota: { remaining }
        })
        const { instance } = getWrapper({ spaces: [space] })
        const result = instance.checkQuotaExceeded([
          mock<OcUppyFile>({
            name: 'name',
            meta: { spaceId: '1', routeName: locationSpacesGeneric.name as string },
            data: { size } as Blob
          })
        ])
        expect(result).toBeFalsy()
      })
      it("does not check quota for other's personal spaces", () => {
        const size = 100
        const remaining = 90
        const space = mock<SpaceResource>({
          driveType: 'personal',
          id: '1',
          spaceQuota: { remaining },
          isOwner: () => false
        })
        const { instance } = getWrapper({ spaces: [space] })
        const result = instance.checkQuotaExceeded([
          mock<OcUppyFile>({
            name: 'name',
            meta: { spaceId: '1', routeName: locationSpacesGeneric.name as string },
            data: { size } as Blob
          })
        ])
        expect(result).toBeFalsy()
      })
    })
    describe('conflict handling check', () => {
      it('checks for conflicts if check enabled', async () => {
        const { instance } = getWrapper()
        await instance.handleUpload([mock<OcUppyFile>({ name: 'name' })])
        expect(getConflictsMock).toHaveBeenCalled()
      })
      it('does not check for conflicts if check disabled', async () => {
        const { instance } = getWrapper({ conflictHandlingEnabled: false })
        await instance.handleUpload([mock<OcUppyFile>({ name: 'name' })])
        expect(getConflictsMock).not.toHaveBeenCalled()
      })
      it('does not start upload if all files were skipped in conflict handling', async () => {
        const { instance, mocks } = getWrapper({ conflicts: [{}], conflictHandlerResult: [] })
        const removeFilesFromUploadSpy = vi.spyOn(instance, 'removeFilesFromUpload')

        await instance.handleUpload([mock<OcUppyFile>({ name: 'name' })])
        expect(mocks.opts.uppyService.uploadFiles).not.toHaveBeenCalled()
        expect(mocks.opts.uppyService.clearInputs).toHaveBeenCalled()
        expect(removeFilesFromUploadSpy).toHaveBeenCalled()
      })
      it('sets the result of the conflict handler as uppy file state', async () => {
        const conflictHandlerResult = [mock<OcUppyFile>({ id: '1' })]
        const { instance, mocks } = getWrapper({ conflicts: [{}], conflictHandlerResult })
        await instance.handleUpload([mock<OcUppyFile>(), mock<OcUppyFile>()])

        expect(mocks.uppy.setState).toHaveBeenCalledWith({
          files: { [conflictHandlerResult[0].id]: conflictHandlerResult[0] }
        })
      })
    })
    describe('create directory tree', () => {
      it('creates the directly tree if enabled', async () => {
        const { instance } = getWrapper()
        const createDirectoryTreeSpy = vi.spyOn(instance, 'createDirectoryTree')
        await instance.handleUpload([mock<OcUppyFile>({ name: 'name' })])
        expect(createDirectoryTreeSpy).toHaveBeenCalled()
      })
      it('does not create the directly tree if disabled', async () => {
        const { instance } = getWrapper({ directoryTreeCreateEnabled: false })
        const createDirectoryTreeSpy = vi.spyOn(instance, 'createDirectoryTree')
        await instance.handleUpload([mock<OcUppyFile>({ name: 'name' })])
        expect(createDirectoryTreeSpy).not.toHaveBeenCalled()
      })
    })
  })
})

const getWrapper = ({
  conflictHandlingEnabled = true,
  directoryTreeCreateEnabled = true,
  quotaCheckEnabled = true,
  conflicts = [],
  conflictHandlerResult = [],
  spaces = []
} = {}) => {
  getConflictsMock = vi.fn(() => conflicts)
  displayOverwriteDialogMock = vi.fn().mockResolvedValue(conflictHandlerResult)

  const route = mock<RouteLocationNormalizedLoaded>()
  route.params.driveAliasAndItem = '1'
  route.query.shareId = '1'

  const uppy = mockDeep<Uppy<OcUppyMeta, OcUppyBody>>()
  uppy.getState.mockReturnValue(mock<State<OcUppyMeta, OcUppyBody>>({ files: {} }))

  createTestingPinia({
    initialState: {
      spaces: { spaces },
      resources: { currentFolder: mock<Resource>({ path: '/' }), resources: [mock<Resource>()] }
    }
  })

  const opts = {
    clientService: mockDeep<ClientService>(),
    language: mock<Language>({ current: 'en' }),
    route: computed(() => route),
    userStore: useUserStore(),
    messageStore: useMessages(),
    spacesStore: useSpacesStore(),
    resourcesStore: useResourcesStore(),
    space: ref(mock<SpaceResource>()),
    uppyService: mock<UppyService>(),
    conflictHandlingEnabled,
    directoryTreeCreateEnabled,
    quotaCheckEnabled
  }

  const mocks = { uppy, opts }
  const instance = new HandleUpload(uppy, opts)
  return { instance, mocks }
}
