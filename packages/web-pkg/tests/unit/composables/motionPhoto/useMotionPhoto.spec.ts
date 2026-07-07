import { mock } from 'vitest-mock-extended'
import { defaultComponentMocks, getComposableWrapper } from '@opencloud-eu/web-test-helpers'
import { Resource, SpaceResource } from '@opencloud-eu/web-client'
import { useMotionPhoto } from '../../../../src/composables/motionPhoto/useMotionPhoto'

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

function getWrapper() {
  const mocks = { ...defaultComponentMocks() }
  let instance: ReturnType<typeof useMotionPhoto>
  const wrapper = getComposableWrapper(
    () => {
      instance = useMotionPhoto()
    },
    { mocks, provide: mocks }
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
})
