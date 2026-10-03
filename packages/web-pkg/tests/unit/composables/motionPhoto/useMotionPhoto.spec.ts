import { mock } from 'vitest-mock-extended'
import { defaultComponentMocks, getComposableWrapper } from '@opencloud-eu/web-test-helpers'
import { Resource, SpaceResource } from '@opencloud-eu/web-client'
import type { WebDAV } from '@opencloud-eu/web-client/webdav'
import {
  isLivePhoto,
  isMotionOrLivePhoto,
  isMotionPhoto,
  useMotionPhoto
} from '../../../../src/composables/motionPhoto/useMotionPhoto'

type SearchResult = Awaited<ReturnType<WebDAV['search']>>

const space = mock<SpaceResource>()

const mp4Blob = () => new Blob([new Uint8Array(80)])

const buildResource = (overrides: Partial<Resource> = {}) =>
  ({
    id: 'mp1',
    fileId: 'mp1',
    path: '/motion.jpg',
    size: 200000,
    motionPhoto: { version: 1, presentationTimestampUs: 500000, videoSize: 120000 },
    ...overrides
  }) as unknown as Resource

const buildLivePhotoStill = (contentId: string, overrides: Partial<Resource> = {}) =>
  ({
    id: `still-${contentId}`,
    fileId: `still-${contentId}`,
    path: '/IMG_0001.HEIC',
    mimeType: 'image/heic',
    size: 200000,
    livePhoto: { contentId },
    ...overrides
  }) as unknown as Resource

const buildLivePhotoVideo = (contentId: string, overrides: Partial<Resource> = {}) =>
  ({
    id: `video-${contentId}`,
    fileId: `video-${contentId}`,
    path: '/IMG_0001.MOV',
    mimeType: 'video/quicktime',
    size: 300000,
    livePhoto: { contentId, stillImageTimeUs: 1250000 },
    ...overrides
  }) as unknown as Resource

function getWrapper({
  resources = [],
  spaces = []
}: { resources?: Resource[]; spaces?: SpaceResource[] } = {}) {
  const mocks = { ...defaultComponentMocks() }
  let instance: ReturnType<typeof useMotionPhoto>
  const wrapper = getComposableWrapper(
    () => {
      instance = useMotionPhoto()
    },
    {
      mocks,
      provide: mocks,
      pluginOptions: {
        piniaOptions: { resourcesStore: { resources }, spacesState: { spaces } }
      }
    }
  )
  return { instance, mocks, wrapper }
}

describe('useMotionPhoto', () => {
  beforeEach(() => {
    global.URL.createObjectURL = vi.fn(() => 'blob:mock-url')
    global.URL.revokeObjectURL = vi.fn()
  })

  describe('isMotionPhoto', () => {
    it('is true when the facet is present, false otherwise', () => {
      const { instance } = getWrapper()
      expect(instance.isMotionPhoto(buildResource())).toBe(true)
      expect(instance.isMotionPhoto(buildResource({ motionPhoto: undefined }))).toBe(false)
    })
    it('is false for both halves of a live photo', () => {
      expect(isMotionPhoto(buildLivePhotoStill('detect'))).toBe(false)
      expect(isMotionPhoto(buildLivePhotoVideo('detect'))).toBe(false)
    })
  })

  describe('isMotionOrLivePhoto', () => {
    it('is true for a motion photo and for the still of a live photo', () => {
      expect(isMotionOrLivePhoto(buildResource())).toBe(true)
      expect(isMotionOrLivePhoto(buildLivePhotoStill('either'))).toBe(true)
    })
    it('is false for the video half of a live photo and for a plain image', () => {
      expect(isMotionOrLivePhoto(buildLivePhotoVideo('either'))).toBe(false)
      expect(isMotionOrLivePhoto(buildResource({ motionPhoto: undefined }))).toBe(false)
    })
  })

  describe('isLivePhoto', () => {
    it('is true only for a still that relies on a paired video', () => {
      expect(isLivePhoto(buildLivePhotoStill('kind'))).toBe(true)
      expect(isLivePhoto(buildLivePhotoVideo('kind'))).toBe(false)
      expect(isLivePhoto(buildResource())).toBe(false)
    })
    it('is false when the still also embeds a video, which wins over the paired one', () => {
      expect(isLivePhoto(buildLivePhotoStill('kind', { motionPhoto: { videoSize: 120000 } }))).toBe(
        false
      )
    })
  })

  describe('getVideoOffset', () => {
    it('returns size - videoSize for a valid motion photo', () => {
      const { instance } = getWrapper()
      expect(instance.getVideoOffset(buildResource())).toBe(80000)
    })
    it('returns null when videoSize exceeds the file size', () => {
      const { instance } = getWrapper()
      const r = buildResource({ size: 1000, motionPhoto: { videoSize: 5000 } })
      expect(instance.getVideoOffset(r)).toBeNull()
    })
    it('returns null without the facet or with non-numeric sizes', () => {
      const { instance } = getWrapper()
      expect(instance.getVideoOffset(buildResource({ motionPhoto: undefined }))).toBeNull()
      expect(instance.getVideoOffset(buildResource({ size: 'not-a-number' }))).toBeNull()
    })
  })

  describe('getStillTimestampSeconds', () => {
    it('converts presentationTimestampUs to seconds', () => {
      const { instance } = getWrapper()
      const r = buildResource({
        motionPhoto: { presentationTimestampUs: 833153, videoSize: 120000 }
      })
      expect(instance.getStillTimestampSeconds(r)).toBeCloseTo(0.833153)
    })
    it('returns null when unspecified (-1) or missing', () => {
      const { instance } = getWrapper()
      expect(
        instance.getStillTimestampSeconds(
          buildResource({ motionPhoto: { presentationTimestampUs: -1, videoSize: 120000 } })
        )
      ).toBeNull()
      expect(
        instance.getStillTimestampSeconds(buildResource({ motionPhoto: undefined }))
      ).toBeNull()
    })
  })

  describe('loadVideoUrl', () => {
    it('requests the trailing bytes via a Range header and returns a video/mp4 blob url', async () => {
      const { instance, mocks } = getWrapper()
      mocks.$clientService.webdav.getFileContents.mockResolvedValue({
        response: { status: 206 },
        body: mp4Blob()
      })

      const url = await instance.loadVideoUrl(space, buildResource())

      expect(url).toBe('blob:mock-url')
      expect(mocks.$clientService.webdav.getFileContents).toHaveBeenCalledWith(
        space,
        { fileId: 'mp1', path: '/motion.jpg' },
        expect.objectContaining({
          responseType: 'blob',
          headers: { Range: 'bytes=80000-' }
        })
      )
      const blobArg = vi.mocked(global.URL.createObjectURL).mock.calls[0][0] as Blob
      expect(blobArg.type).toBe('video/mp4')
    })

    it('memoizes the blob url per resource (no double fetch)', async () => {
      const { instance, mocks } = getWrapper()
      mocks.$clientService.webdav.getFileContents.mockResolvedValue({
        response: { status: 206 },
        body: mp4Blob()
      })
      const resource = buildResource()

      const first = await instance.loadVideoUrl(space, resource)
      const second = await instance.loadVideoUrl(space, resource)

      expect(first).toBe(second)
      expect(mocks.$clientService.webdav.getFileContents).toHaveBeenCalledTimes(1)
    })

    it('falls back to slicing the full body when the server ignores Range (200)', async () => {
      const { instance, mocks } = getWrapper()
      // small resource so the offset is small: 200 - 120 = 80
      const resource = buildResource({
        size: 200,
        motionPhoto: { version: 1, presentationTimestampUs: 0, videoSize: 120 }
      })
      // full body = 80 leading (still) bytes + the mp4
      const fullBody = new Blob([new Uint8Array(80), new Uint8Array(64)])
      const sliceSpy = vi.spyOn(fullBody, 'slice')
      mocks.$clientService.webdav.getFileContents.mockResolvedValue({
        response: { status: 200 },
        body: fullBody
      })

      const url = await instance.loadVideoUrl(space, resource)

      expect(url).toBe('blob:mock-url')
      expect(sliceSpy).toHaveBeenCalledWith(80)
    })

    it('throws for a resource that is not a playable motion photo', async () => {
      const { instance } = getWrapper()
      await expect(
        instance.loadVideoUrl(space, buildResource({ motionPhoto: undefined }))
      ).rejects.toThrow()
    })
  })

  describe('loadVideoUrl for a live photo', () => {
    it('loads the whole paired video found in the current folder, without searching', async () => {
      const still = buildLivePhotoStill('folder')
      const video = buildLivePhotoVideo('folder')
      const { instance, mocks } = getWrapper({ resources: [still, video] })
      mocks.$clientService.webdav.getFileContents.mockResolvedValue({
        response: { status: 200 },
        body: mp4Blob()
      })

      const url = await instance.loadVideoUrl(space, still)

      expect(url).toBe('blob:mock-url')
      expect(mocks.$clientService.webdav.getFileContents).toHaveBeenCalledTimes(1)
      const [fileSpace, file, options] = mocks.$clientService.webdav.getFileContents.mock.calls[0]
      expect(fileSpace).toBe(space)
      expect(file).toEqual({ fileId: 'video-folder' })
      expect(options.responseType).toBe('blob')
      expect(options.headers).toBeUndefined()
      expect(mocks.$clientService.webdav.search).not.toHaveBeenCalled()
    })

    it('loads a listed video from its own space when it lives in another space than the still', async () => {
      const still = buildLivePhotoStill('listed', { storageId: 'still-space' })
      const otherSpace = mock<SpaceResource>({ id: 'other-space', driveType: 'project' })
      const video = buildLivePhotoVideo('listed', { storageId: 'other-space' })
      const { instance, mocks } = getWrapper({ resources: [still, video], spaces: [otherSpace] })
      mocks.$clientService.webdav.getFileContents.mockResolvedValue({
        response: { status: 200 },
        body: mp4Blob()
      })

      await instance.loadVideoUrl(space, still)

      const [fileSpace] = mocks.$clientService.webdav.getFileContents.mock.calls[0]
      expect(fileSpace.id).toBe('other-space')
      expect(mocks.$clientService.webdav.search).not.toHaveBeenCalled()
    })

    it('does not search in a public link, where only the listed resources count', async () => {
      const still = buildLivePhotoStill('public')
      const publicSpace = mock<SpaceResource>({ driveType: 'public' })
      const { instance, mocks } = getWrapper({ resources: [still] })

      await expect(instance.loadVideoUrl(publicSpace, still)).rejects.toThrow()

      expect(mocks.$clientService.webdav.search).not.toHaveBeenCalled()
      expect(instance.canPlay(still)).toBe(false)
    })

    it('loads the listed video by its path in a public link, which has no id based access', async () => {
      const still = buildLivePhotoStill('public-listed')
      const publicSpace = mock<SpaceResource>({ driveType: 'public' })
      const { instance, mocks } = getWrapper({
        resources: [still, buildLivePhotoVideo('public-listed')]
      })
      mocks.$clientService.webdav.getFileContents.mockResolvedValue({
        response: { status: 200 },
        body: mp4Blob()
      })

      await instance.loadVideoUrl(publicSpace, still)

      const [, file] = mocks.$clientService.webdav.getFileContents.mock.calls[0]
      expect(file).toEqual({ path: '/IMG_0001.MOV' })
    })

    it('falls back to a search by content id and loads the video hit from its own space', async () => {
      const still = buildLivePhotoStill('search')
      const otherSpace = mock<SpaceResource>({ id: 'other-space', driveType: 'project' })
      const video = buildLivePhotoVideo('search', { storageId: 'other-space' })
      const { instance, mocks } = getWrapper({ resources: [still], spaces: [otherSpace] })
      mocks.$clientService.webdav.search.mockResolvedValue({
        resources: [still, video],
        totalResults: 2
      } as SearchResult)
      mocks.$clientService.webdav.getFileContents.mockResolvedValue({
        response: { status: 200 },
        body: mp4Blob()
      })

      const url = await instance.loadVideoUrl(space, still)

      expect(url).toBe('blob:mock-url')
      expect(mocks.$clientService.webdav.search).toHaveBeenCalledWith(
        'livePhoto.contentId:"search"',
        expect.objectContaining({ searchLimit: expect.any(Number) })
      )
      const [fileSpace, file] = mocks.$clientService.webdav.getFileContents.mock.calls[0]
      expect(fileSpace.id).toBe('other-space')
      expect(file).toEqual({ fileId: 'video-search' })
      expect(instance.getStillTimestampSeconds(still)).toBeCloseTo(1.25)
      expect(mocks.$clientService.webdav.getFileInfo).not.toHaveBeenCalled()
    })

    it('loads the facet of a search hit that comes without one', async () => {
      const still = buildLivePhotoStill('search-facet')
      const video = buildLivePhotoVideo('search-facet')
      const { instance, mocks } = getWrapper({ resources: [still] })
      mocks.$clientService.webdav.search.mockResolvedValue({
        resources: [{ ...video, livePhoto: undefined }],
        totalResults: 1
      } as SearchResult)
      mocks.$clientService.webdav.getFileInfo.mockResolvedValue(video)
      mocks.$clientService.webdav.getFileContents.mockResolvedValue({
        response: { status: 200 },
        body: mp4Blob()
      })

      await instance.loadVideoUrl(space, still)

      const [, file] = mocks.$clientService.webdav.getFileInfo.mock.calls[0]
      expect(file).toEqual({ fileId: 'video-search-facet' })
      expect(instance.getStillTimestampSeconds(still)).toBeCloseTo(1.25)
    })

    it('plays a video found by the search even when its facet cannot be loaded', async () => {
      const still = buildLivePhotoStill('search-no-facet')
      const video = buildLivePhotoVideo('search-no-facet', { livePhoto: undefined })
      const { instance, mocks } = getWrapper({ resources: [still] })
      mocks.$clientService.webdav.search.mockResolvedValue({
        resources: [video],
        totalResults: 1
      } as SearchResult)
      mocks.$clientService.webdav.getFileInfo.mockRejectedValue(new Error('gone'))
      mocks.$clientService.webdav.getFileContents.mockResolvedValue({
        response: { status: 200 },
        body: mp4Blob()
      })

      await expect(instance.loadVideoUrl(space, still)).resolves.toBe('blob:mock-url')
    })
  })

  describe('revokeAll', () => {
    it('revokes created blob urls on scope dispose', async () => {
      const { instance, mocks, wrapper } = getWrapper()
      mocks.$clientService.webdav.getFileContents.mockResolvedValue({
        response: { status: 206 },
        body: mp4Blob()
      })
      await instance.loadVideoUrl(space, buildResource())

      wrapper.unmount()

      expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url')
    })
  })
  describe('revoke', () => {
    it('revokes and forgets the cached url of one resource only', async () => {
      const { instance, mocks } = getWrapper()
      mocks.$clientService.webdav.getFileContents.mockResolvedValue({
        response: { status: 206 },
        body: mp4Blob()
      })
      await instance.loadVideoUrl(space, buildResource())
      await instance.loadVideoUrl(space, buildResource({ id: 'mp2', fileId: 'mp2' }))

      instance.revoke('mp1')
      expect(global.URL.revokeObjectURL).toHaveBeenCalledTimes(1)

      // mp1 is fetched again, mp2 is still served from the cache
      await instance.loadVideoUrl(space, buildResource())
      await instance.loadVideoUrl(space, buildResource({ id: 'mp2', fileId: 'mp2' }))
      expect(mocks.$clientService.webdav.getFileContents).toHaveBeenCalledTimes(3)
    })

    it('ignores unknown ids', () => {
      const { instance } = getWrapper()
      instance.revoke('nope')
      expect(global.URL.revokeObjectURL).not.toHaveBeenCalled()
    })
  })
})
