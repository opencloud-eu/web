import { ref } from 'vue'
import { defaultComponentMocks, getComposableWrapper } from '@opencloud-eu/web-test-helpers'
import { mock } from 'vitest-mock-extended'
import { buildSpaceImageResource, Resource, SpaceResource } from '@opencloud-eu/web-client'
import { useLoadPreview } from '../../../../src/composables/resources'
import { usePreviewService } from '../../../../src/composables/previewService'
import { PreviewService, ProcessorType } from '../../../../src/services'
import { FolderViewModeConstants, ImageDimension, useTileSize } from '../../../../src'
import { useSpacesStore } from '../../../../src/composables/piniaStores'

vi.mock('../../../../src/composables/previewService/usePreviewService')
vi.mock('@opencloud-eu/web-client', async (importOriginal) => ({
  ...(await importOriginal<any>()),
  buildSpaceImageResource: vi.fn(() => mock<SpaceResource>({ id: '1' }))
}))

describe('useLoadPreview', () => {
  afterEach(() => {
    window.devicePixelRatio = 1
    useTileSize().setRenderedTileSize(0)
  })

  describe('loadPreview', () => {
    it('returns a loaded preview for a given file', async () => {
      const loadedPreview = 'blob:image'
      const { instance } = getWrapper({
        loadedPreview
      })
      const space = mock<SpaceResource>()
      const resource = mock<Resource>({ isInVault: false, thumbnail: undefined })
      const preview = await instance.loadPreview({ space, resource })
      expect(preview).toEqual(loadedPreview)
    })
    describe('project space resources', () => {
      it('does not return a preview for a project space without spaceImageData', async () => {
        const { instance } = getWrapper()
        const space = mock<SpaceResource>({
          driveType: 'project',
          isInVault: false,
          spaceImageData: undefined
        })
        const resource = space
        const preview = await instance.loadPreview({ space, resource })
        expect(preview).toBe(null)
      })
      it('does not return a preview for a disabled project space', async () => {
        const { instance } = getWrapper()
        const space = mock<SpaceResource>({
          driveType: 'project',
          isInVault: false,
          disabled: true
        })
        const resource = space
        const preview = await instance.loadPreview({ space, resource })
        expect(preview).toBe(null)
      })
      it('calls buildSpaceImageResource to build a space image resource', async () => {
        const { instance } = getWrapper()
        const buildSpaceImageResourceMock = vi.mocked(buildSpaceImageResource)
        const space = mock<SpaceResource>({
          driveType: 'project',
          isInVault: false,
          disabled: false,
          thumbnail: undefined
        })
        const resource = space
        const preview = await instance.loadPreview({ space, resource })
        expect(preview).toBeDefined()
        expect(buildSpaceImageResourceMock).toHaveBeenCalledTimes(1)
      })
      it('adds and removes the space from the image loading queue', async () => {
        const { instance } = getWrapper()
        const space = mock<SpaceResource>({
          driveType: 'project',
          isInVault: false,
          disabled: false,
          spaceImageData: { id: '1' },
          thumbnail: undefined
        })
        const resource = space
        const spacesStore = useSpacesStore()
        await instance.loadPreview({ space, resource })
        expect(spacesStore.addToImagesLoading).toHaveBeenCalledTimes(1)
        expect(spacesStore.removeFromImagesLoading).toHaveBeenCalledTimes(1)
      })
    })
    describe('dimensions', () => {
      it('uses the thumbnail default dimensions', async () => {
        const { instance, previewService } = getWrapper()
        const space = mock<SpaceResource>()
        const resource = mock<Resource>({ isInVault: false, thumbnail: undefined })
        await instance.loadPreview({ space, resource })
        expect(previewService.loadPreview).toHaveBeenCalledWith(
          expect.objectContaining({ dimensions: ImageDimension.Thumbnail }),
          expect.anything(),
          expect.anything(),
          expect.anything()
        )
      })
      it('uses the maximum tile dimensions in tiles view while no tile has been rendered', async () => {
        const { instance, previewService } = getWrapper({
          viewMode: FolderViewModeConstants.name.tiles
        })
        const space = mock<SpaceResource>()
        const resource = mock<Resource>({ isInVault: false, thumbnail: undefined })
        await instance.loadPreview({ space, resource })
        expect(previewService.loadPreview).toHaveBeenCalledWith(
          expect.objectContaining({ dimensions: [768, 768] }),
          expect.anything(),
          expect.anything(),
          expect.anything()
        )
      })
      it('derives the tile dimensions from the rendered tile size', async () => {
        window.devicePixelRatio = 1
        useTileSize().setRenderedTileSize(400)
        const { instance, previewService } = getWrapper({
          viewMode: FolderViewModeConstants.name.tiles
        })
        const space = mock<SpaceResource>()
        const resource = mock<Resource>({ isInVault: false, thumbnail: undefined })
        await instance.loadPreview({ space, resource })
        expect(previewService.loadPreview).toHaveBeenCalledWith(
          expect.objectContaining({ dimensions: [448, 448] }),
          expect.anything(),
          expect.anything(),
          expect.anything()
        )
      })
      it('does not go below the minimum tile dimensions', async () => {
        window.devicePixelRatio = 1
        useTileSize().setRenderedTileSize(150)
        const { instance, previewService } = getWrapper({
          viewMode: FolderViewModeConstants.name.tiles
        })
        const space = mock<SpaceResource>()
        const resource = mock<Resource>({ isInVault: false, thumbnail: undefined })
        await instance.loadPreview({ space, resource })
        expect(previewService.loadPreview).toHaveBeenCalledWith(
          expect.objectContaining({ dimensions: [320, 320] }),
          expect.anything(),
          expect.anything(),
          expect.anything()
        )
      })
      it('caps the device pixel ratio the tile dimensions are scaled with', async () => {
        window.devicePixelRatio = 3
        useTileSize().setRenderedTileSize(300)
        const { instance, previewService } = getWrapper({
          viewMode: FolderViewModeConstants.name.tiles
        })
        const space = mock<SpaceResource>()
        const resource = mock<Resource>({ isInVault: false, thumbnail: undefined })
        await instance.loadPreview({ space, resource })
        expect(previewService.loadPreview).toHaveBeenCalledWith(
          expect.objectContaining({ dimensions: [512, 512] }),
          expect.anything(),
          expect.anything(),
          expect.anything()
        )
      })
      it('caps the tile dimensions for large tiles', async () => {
        window.devicePixelRatio = 2
        useTileSize().setRenderedTileSize(600)
        const { instance, previewService } = getWrapper({
          viewMode: FolderViewModeConstants.name.tiles
        })
        const space = mock<SpaceResource>()
        const resource = mock<Resource>({ isInVault: false, thumbnail: undefined })
        await instance.loadPreview({ space, resource })
        expect(previewService.loadPreview).toHaveBeenCalledWith(
          expect.objectContaining({ dimensions: [768, 768] }),
          expect.anything(),
          expect.anything(),
          expect.anything()
        )
      })
      it('can overwrite the default dimensions', async () => {
        const { instance, previewService } = getWrapper()
        const space = mock<SpaceResource>()
        const resource = mock<Resource>({ isInVault: false, thumbnail: undefined })
        await instance.loadPreview({ space, resource, dimensions: ImageDimension.Preview })
        expect(previewService.loadPreview).toHaveBeenCalledWith(
          expect.objectContaining({ dimensions: ImageDimension.Preview }),
          expect.anything(),
          expect.anything(),
          expect.anything()
        )
      })
    })
    describe('processor', () => {
      it('uses the thumbnail default processor', async () => {
        const { instance, previewService } = getWrapper()
        const space = mock<SpaceResource>()
        const resource = mock<Resource>({ isInVault: false, thumbnail: undefined })
        await instance.loadPreview({ space, resource })
        expect(previewService.loadPreview).toHaveBeenCalledWith(
          expect.objectContaining({ processor: ProcessorType.enum.thumbnail }),
          expect.anything(),
          expect.anything(),
          expect.anything()
        )
      })
      it('uses the fit default processor in tiles view', async () => {
        const { instance, previewService } = getWrapper({
          viewMode: FolderViewModeConstants.name.tiles
        })
        const space = mock<SpaceResource>()
        const resource = mock<Resource>({ isInVault: false, thumbnail: undefined })
        await instance.loadPreview({ space, resource })
        expect(previewService.loadPreview).toHaveBeenCalledWith(
          expect.objectContaining({ processor: ProcessorType.enum.fit }),
          expect.anything(),
          expect.anything(),
          expect.anything()
        )
      })
      it('can overwrite the default processor', async () => {
        const { instance, previewService } = getWrapper()
        const space = mock<SpaceResource>()
        const resource = mock<Resource>({ isInVault: false, thumbnail: undefined })
        await instance.loadPreview({ space, resource, processor: ProcessorType.enum.resize })
        expect(previewService.loadPreview).toHaveBeenCalledWith(
          expect.objectContaining({ processor: ProcessorType.enum.resize }),
          expect.anything(),
          expect.anything(),
          expect.anything()
        )
      })
    })
  })

  describe('dropPreview', () => {
    it('drops a preview that is still queued', async () => {
      const { instance, previewService } = getWrapper()
      previewService.loadPreview.mockReturnValue(new Promise(() => {}))
      const space = mock<SpaceResource>()
      const running = Array.from({ length: 4 }, (_, i) =>
        mock<Resource>({ id: `running-${i}`, isInVault: false, thumbnail: undefined })
      )
      const queued = mock<Resource>({ id: 'queued', isInVault: false, thumbnail: undefined })

      running.forEach((resource) => instance.loadPreview({ space, resource }))
      const queuedPreview = instance.loadPreview({ space, resource: queued })
      await flushQueue()
      instance.dropPreview(queued)

      expect(await queuedPreview).toBeUndefined()
      // only the four running previews made it to the preview service
      expect(previewService.loadPreview).toHaveBeenCalledTimes(4)
    })
    it('keeps a preview that is already running', async () => {
      const { instance, previewService } = getWrapper()
      let resolvePreview: (preview: string) => void
      previewService.loadPreview.mockReturnValue(
        new Promise((resolve) => (resolvePreview = resolve))
      )
      const space = mock<SpaceResource>()
      const resource = mock<Resource>({
        id: 'running',
        isInVault: false,
        thumbnail: undefined
      })

      const preview = instance.loadPreview({ space, resource })
      await flushQueue()
      instance.dropPreview(resource)
      resolvePreview('blob:image')

      expect(await preview).toEqual('blob:image')
    })
  })
})

function flushQueue() {
  return new Promise((resolve) => setTimeout(resolve))
}

function getWrapper({
  loadedPreview = 'blob:image',
  viewMode
}: {
  loadedPreview?: string
  viewMode?: string
} = {}) {
  const mocks = defaultComponentMocks()
  const previewService = mock<PreviewService>()
  previewService.loadPreview.mockResolvedValue(loadedPreview)
  vi.mocked(usePreviewService).mockReturnValue(previewService)

  let instance: ReturnType<typeof useLoadPreview>
  const wrapper = getComposableWrapper(
    () => {
      instance = useLoadPreview(viewMode ? ref(viewMode) : undefined)
    },
    {
      mocks,
      provide: mocks
    }
  )
  return { wrapper, instance, previewService }
}
