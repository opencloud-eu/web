import { ref, Ref } from 'vue'
import { defaultComponentMocks, getComposableWrapper } from '@opencloud-eu/web-test-helpers'
import { mock, MockProxy } from 'vitest-mock-extended'
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
    it('returns a loaded preview for a given file', () => {
      const loadedPreview = 'blob:image'
      getWrapper({
        setup: async ({ loadPreview }) => {
          const space = mock<SpaceResource>()
          const resource = mock<Resource>({ isInVault: false, thumbnail: undefined })
          const preview = await loadPreview({ space, resource })
          expect(preview).toEqual(loadedPreview)
        },
        loadedPreview
      })
    })
    describe('project space resources', () => {
      it('does not return a preview for a project space without spaceImageData', () => {
        getWrapper({
          setup: async ({ loadPreview }) => {
            const space = mock<SpaceResource>({
              driveType: 'project',
              isInVault: false,
              spaceImageData: undefined
            })
            const resource = space
            const preview = await loadPreview({ space, resource })
            expect(preview).toBe(null)
          }
        })
      })
      it('does not return a preview for a disabled project space', () => {
        getWrapper({
          setup: async ({ loadPreview }) => {
            const space = mock<SpaceResource>({
              driveType: 'project',
              isInVault: false,
              disabled: true
            })
            const resource = space
            const preview = await loadPreview({ space, resource })
            expect(preview).toBe(null)
          }
        })
      })
      it('calls buildSpaceImageResource to build a space image resource', () => {
        getWrapper({
          setup: async ({ loadPreview }) => {
            const buildSpaceImageResourceMock = vi.mocked(buildSpaceImageResource)
            const space = mock<SpaceResource>({
              driveType: 'project',
              isInVault: false,
              disabled: false,
              thumbnail: undefined
            })
            const resource = space
            const preview = await loadPreview({ space, resource })
            expect(preview).toBeDefined()
            expect(buildSpaceImageResourceMock).toHaveBeenCalledTimes(1)
          }
        })
      })
      it('adds and removes the space from the image loading queue', () => {
        getWrapper({
          setup: async ({ loadPreview }) => {
            const space = mock<SpaceResource>({
              driveType: 'project',
              isInVault: false,
              disabled: false,
              spaceImageData: { id: '1' },
              thumbnail: undefined
            })
            const resource = space
            const spacesStore = useSpacesStore()
            await loadPreview({ space, resource })
            expect(spacesStore.addToImagesLoading).toHaveBeenCalledTimes(1)
            expect(spacesStore.removeFromImagesLoading).toHaveBeenCalledTimes(1)
          }
        })
      })
    })
    describe('dimensions', () => {
      it('uses the thumbnail default dimensions', () => {
        getWrapper({
          setup: async ({ loadPreview }, { previewService }) => {
            const space = mock<SpaceResource>()
            const resource = mock<Resource>({ isInVault: false, thumbnail: undefined })
            await loadPreview({ space, resource })
            expect(previewService.loadPreview).toHaveBeenCalledWith(
              expect.objectContaining({ dimensions: ImageDimension.Thumbnail }),
              expect.anything(),
              expect.anything(),
              expect.anything()
            )
          }
        })
      })
      it('uses the maximum tile dimensions in tiles view while no tile has been rendered', () => {
        getWrapper({
          setup: async ({ loadPreview }, { previewService }) => {
            const space = mock<SpaceResource>()
            const resource = mock<Resource>({ isInVault: false, thumbnail: undefined })
            await loadPreview({ space, resource })
            expect(previewService.loadPreview).toHaveBeenCalledWith(
              expect.objectContaining({ dimensions: [768, 768] }),
              expect.anything(),
              expect.anything(),
              expect.anything()
            )
          },
          viewMode: FolderViewModeConstants.name.tiles
        })
      })
      it('derives the tile dimensions from the rendered tile size', () => {
        window.devicePixelRatio = 1
        useTileSize().setRenderedTileSize(400)
        getWrapper({
          setup: async ({ loadPreview }, { previewService }) => {
            const space = mock<SpaceResource>()
            const resource = mock<Resource>({ isInVault: false, thumbnail: undefined })
            await loadPreview({ space, resource })
            expect(previewService.loadPreview).toHaveBeenCalledWith(
              expect.objectContaining({ dimensions: [448, 448] }),
              expect.anything(),
              expect.anything(),
              expect.anything()
            )
          },
          viewMode: FolderViewModeConstants.name.tiles
        })
      })
      it('does not go below the minimum tile dimensions', () => {
        window.devicePixelRatio = 1
        useTileSize().setRenderedTileSize(150)
        getWrapper({
          setup: async ({ loadPreview }, { previewService }) => {
            const space = mock<SpaceResource>()
            const resource = mock<Resource>({ isInVault: false, thumbnail: undefined })
            await loadPreview({ space, resource })
            expect(previewService.loadPreview).toHaveBeenCalledWith(
              expect.objectContaining({ dimensions: [320, 320] }),
              expect.anything(),
              expect.anything(),
              expect.anything()
            )
          },
          viewMode: FolderViewModeConstants.name.tiles
        })
      })
      it('caps the device pixel ratio the tile dimensions are scaled with', () => {
        window.devicePixelRatio = 3
        useTileSize().setRenderedTileSize(300)
        getWrapper({
          setup: async ({ loadPreview }, { previewService }) => {
            const space = mock<SpaceResource>()
            const resource = mock<Resource>({ isInVault: false, thumbnail: undefined })
            await loadPreview({ space, resource })
            expect(previewService.loadPreview).toHaveBeenCalledWith(
              expect.objectContaining({ dimensions: [512, 512] }),
              expect.anything(),
              expect.anything(),
              expect.anything()
            )
          },
          viewMode: FolderViewModeConstants.name.tiles
        })
      })
      it('caps the tile dimensions for large tiles', () => {
        window.devicePixelRatio = 2
        useTileSize().setRenderedTileSize(600)
        getWrapper({
          setup: async ({ loadPreview }, { previewService }) => {
            const space = mock<SpaceResource>()
            const resource = mock<Resource>({ isInVault: false, thumbnail: undefined })
            await loadPreview({ space, resource })
            expect(previewService.loadPreview).toHaveBeenCalledWith(
              expect.objectContaining({ dimensions: [768, 768] }),
              expect.anything(),
              expect.anything(),
              expect.anything()
            )
          },
          viewMode: FolderViewModeConstants.name.tiles
        })
      })
      it('can overwrite the default dimensions', () => {
        getWrapper({
          setup: async ({ loadPreview }, { previewService }) => {
            const space = mock<SpaceResource>()
            const resource = mock<Resource>({ isInVault: false, thumbnail: undefined })
            await loadPreview({ space, resource, dimensions: ImageDimension.Preview })
            expect(previewService.loadPreview).toHaveBeenCalledWith(
              expect.objectContaining({ dimensions: ImageDimension.Preview }),
              expect.anything(),
              expect.anything(),
              expect.anything()
            )
          }
        })
      })
    })
    describe('processor', () => {
      it('uses the thumbnail default processor', () => {
        getWrapper({
          setup: async ({ loadPreview }, { previewService }) => {
            const space = mock<SpaceResource>()
            const resource = mock<Resource>({ isInVault: false, thumbnail: undefined })
            await loadPreview({ space, resource })
            expect(previewService.loadPreview).toHaveBeenCalledWith(
              expect.objectContaining({ processor: ProcessorType.enum.thumbnail }),
              expect.anything(),
              expect.anything(),
              expect.anything()
            )
          }
        })
      })
      it('uses the fit default processor in tiles view', () => {
        getWrapper({
          setup: async ({ loadPreview }, { previewService }) => {
            const space = mock<SpaceResource>()
            const resource = mock<Resource>({ isInVault: false, thumbnail: undefined })
            await loadPreview({ space, resource })
            expect(previewService.loadPreview).toHaveBeenCalledWith(
              expect.objectContaining({ processor: ProcessorType.enum.fit }),
              expect.anything(),
              expect.anything(),
              expect.anything()
            )
          },
          viewMode: FolderViewModeConstants.name.tiles
        })
      })
      it('can overwrite the default processor', () => {
        getWrapper({
          setup: async ({ loadPreview }, { previewService }) => {
            const space = mock<SpaceResource>()
            const resource = mock<Resource>({ isInVault: false, thumbnail: undefined })
            await loadPreview({ space, resource, processor: ProcessorType.enum.resize })
            expect(previewService.loadPreview).toHaveBeenCalledWith(
              expect.objectContaining({ processor: ProcessorType.enum.resize }),
              expect.anything(),
              expect.anything(),
              expect.anything()
            )
          }
        })
      })
    })

    it('reuses an existing thumbnail only for the same preview profile', () => {
      getWrapper({
        setup: async ({ loadPreview }, { previewService }) => {
          const space = mock<SpaceResource>()
          const resource = mock<Resource>({
            id: 'resource-1',
            isInVault: false,
            thumbnail: undefined
          })

          await loadPreview({ space, resource })
          resource.thumbnail = 'blob:image'

          await loadPreview({ space, resource })

          expect(previewService.loadPreview).toHaveBeenCalledTimes(1)
        }
      })
    })

    it('reuses an existing thumbnail for smaller dimensions with the same processor', () => {
      getWrapper({
        setup: async ({ loadPreview }, { previewService }) => {
          const space = mock<SpaceResource>()
          const resource = mock<Resource>({
            id: 'resource-1',
            isInVault: false,
            thumbnail: undefined
          })

          await loadPreview({
            space,
            resource,
            processor: ProcessorType.enum.resize,
            dimensions: [512, 512]
          })
          resource.thumbnail = 'blob:image'

          await loadPreview({
            space,
            resource,
            processor: ProcessorType.enum.resize,
            dimensions: [320, 320]
          })

          expect(previewService.loadPreview).toHaveBeenCalledTimes(1)
        }
      })
    })

    it('reloads preview when view mode changes and requires a different profile', () => {
      const viewMode = ref<string>(FolderViewModeConstants.name.table)

      getWrapper({
        viewMode,
        setup: async ({ loadPreview }, { previewService }) => {
          const space = mock<SpaceResource>()
          const resource = mock<Resource>({
            id: 'resource-2',
            isInVault: false,
            thumbnail: undefined
          })

          await loadPreview({ space, resource })
          resource.thumbnail = 'blob:table'

          viewMode.value = FolderViewModeConstants.name.tiles
          await loadPreview({ space, resource })

          expect(previewService.loadPreview).toHaveBeenCalledTimes(2)
          expect(previewService.loadPreview).toHaveBeenNthCalledWith(
            1,
            expect.objectContaining({
              dimensions: ImageDimension.Thumbnail,
              processor: ProcessorType.enum.thumbnail
            }),
            expect.anything(),
            expect.anything(),
            expect.anything()
          )
          expect(previewService.loadPreview).toHaveBeenNthCalledWith(
            2,
            expect.objectContaining({
              dimensions: [768, 768],
              processor: ProcessorType.enum.fit
            }),
            expect.anything(),
            expect.anything(),
            expect.anything()
          )
        }
      })
    })
  })

  describe('dropPreview', () => {
    it('drops a preview that is still queued', async () => {
      let assertions: Promise<void>
      getWrapper({
        setup: ({ loadPreview, dropPreview }, { previewService }) => {
          assertions = (async () => {
            previewService.loadPreview.mockReturnValue(new Promise(() => {}))
            const space = mock<SpaceResource>()
            const running = Array.from({ length: 4 }, (_, i) =>
              mock<Resource>({ id: `running-${i}`, isInVault: false, thumbnail: undefined })
            )
            const queued = mock<Resource>({ id: 'queued', isInVault: false, thumbnail: undefined })

            running.forEach((resource) => loadPreview({ space, resource }))
            const queuedPreview = loadPreview({ space, resource: queued })
            await flushQueue()
            dropPreview(queued)

            expect(await queuedPreview).toBeUndefined()
            // only the four running previews made it to the preview service
            expect(previewService.loadPreview).toHaveBeenCalledTimes(4)
          })()
        }
      })
      await assertions
    })
    it('keeps a preview that is already running', async () => {
      let assertions: Promise<void>
      getWrapper({
        setup: ({ loadPreview, dropPreview }, { previewService }) => {
          assertions = (async () => {
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

            const preview = loadPreview({ space, resource })
            await flushQueue()
            dropPreview(resource)
            resolvePreview('blob:image')

            expect(await preview).toEqual('blob:image')
          })()
        }
      })
      await assertions
    })
  })
})

function flushQueue() {
  return new Promise((resolve) => setTimeout(resolve))
}

function getWrapper({
  setup,
  loadedPreview = 'blob:image',
  viewMode
}: {
  setup: (
    instance: ReturnType<typeof useLoadPreview>,
    mocks: { previewService: MockProxy<PreviewService> }
  ) => void
  loadedPreview?: string
  viewMode?: string | Ref<string>
}) {
  const mocks = defaultComponentMocks()
  const previewService = mock<PreviewService>()
  previewService.loadPreview.mockResolvedValue(loadedPreview)
  vi.mocked(usePreviewService).mockReturnValue(previewService)

  return {
    wrapper: getComposableWrapper(
      () => {
        const modeRef = typeof viewMode === 'string' ? ref(viewMode) : viewMode
        const instance = useLoadPreview(modeRef)
        setup(instance, { previewService })
      },
      {
        mocks,
        provide: mocks
      }
    )
  }
}
