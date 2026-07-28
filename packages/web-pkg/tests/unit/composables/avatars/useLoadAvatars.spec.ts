import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useLoadAvatars } from '../../../../src/composables/avatars/useLoadAvatars'
import { useAvatarsStore } from '../../../../src/composables/piniaStores'
import { useClientService } from '../../../../src/composables/clientService'
import { createTestingPinia, getComposableWrapper } from '@opencloud-eu/web-test-helpers'

vi.mock('../../../../src/composables/clientService')

describe('useLoadAvatars', () => {
  let mockGetUserPhoto: ReturnType<typeof vi.fn>

  beforeEach(() => {
    createTestingPinia({ stubActions: false })

    mockGetUserPhoto = vi.fn()
    vi.mocked(useClientService).mockReturnValue({
      graphAuthenticated: {
        photos: {
          getUserPhoto: mockGetUserPhoto
        }
      }
    } as any)
  })

  describe('enqueueAvatar', () => {
    it('should enqueue an avatar request', () => {
      getWrapper({
        setup: ({ enqueueAvatar }) => {
          const avatarsStore = useAvatarsStore()
          const userId = 'user123'

          enqueueAvatar(userId)

          expect(avatarsStore.abortControllers.has(userId)).toBe(true)
          expect(avatarsStore.pendingAvatarsRequests.has(userId)).toBe(true)
        }
      })
    })

    it('should not enqueue duplicate requests', () => {
      getWrapper({
        setup: ({ enqueueAvatar }) => {
          const avatarsStore = useAvatarsStore()
          const userId = 'user123'

          enqueueAvatar(userId)
          const firstController = avatarsStore.abortControllers.get(userId)

          enqueueAvatar(userId)
          const secondController = avatarsStore.abortControllers.get(userId)

          expect(firstController).toBe(secondController)
        }
      })
    })

    it('should not enqueue if avatar already exists', () => {
      getWrapper({
        setup: ({ enqueueAvatar }) => {
          const avatarsStore = useAvatarsStore()
          const userId = 'user123'

          avatarsStore.addAvatar(userId, 'blob:http://example.com/avatar')
          enqueueAvatar(userId)

          expect(avatarsStore.abortControllers.has(userId)).toBe(false)
        }
      })
    })

    it('should load avatar and add to store', async () => {
      const mockBlob = new Blob(['avatar'], { type: 'image/png' })
      mockGetUserPhoto.mockResolvedValue(mockBlob)
      URL.createObjectURL = vi.fn(() => 'blob:http://example.com/avatar')

      await getWrapper({
        setup: async ({ enqueueAvatar }) => {
          const avatarsStore = useAvatarsStore()
          const userId = 'user123'

          enqueueAvatar(userId)
          await avatarsStore.pendingAvatarsRequests.get(userId)

          expect(avatarsStore.getAvatar(userId)).toBe('blob:http://example.com/avatar')
          expect(mockGetUserPhoto).toHaveBeenCalledWith(userId, {
            responseType: 'blob',
            signal: expect.any(AbortSignal)
          })
        }
      })
    })

    it('should handle 404 errors and set avatar to null', async () => {
      mockGetUserPhoto.mockRejectedValue({ response: { status: 404 } })

      await getWrapper({
        setup: async ({ enqueueAvatar }) => {
          const avatarsStore = useAvatarsStore()
          const userId = 'user123'

          enqueueAvatar(userId)
          await avatarsStore.pendingAvatarsRequests.get(userId)

          expect(avatarsStore.getAvatar(userId)).toBe(null)
        }
      })
    })

    it('should clean up abort controller after request completes', async () => {
      mockGetUserPhoto.mockResolvedValue(new Blob())

      await getWrapper({
        setup: async ({ enqueueAvatar }) => {
          const avatarsStore = useAvatarsStore()
          const userId = 'user123'

          enqueueAvatar(userId)
          await avatarsStore.pendingAvatarsRequests.get(userId)

          expect(avatarsStore.abortControllers.has(userId)).toBe(false)
        }
      })
    })
  })

  describe('cancelAvatar', () => {
    it('should abort pending request', () => {
      getWrapper({
        setup: ({ enqueueAvatar, cancelAvatar }) => {
          const avatarsStore = useAvatarsStore()
          const userId = 'user123'

          enqueueAvatar(userId)
          const abortController = avatarsStore.abortControllers.get(userId)
          const abortSpy = vi.spyOn(abortController!, 'abort')

          cancelAvatar(userId)

          expect(abortSpy).toHaveBeenCalled()
          expect(avatarsStore.abortControllers.has(userId)).toBe(false)
          expect(avatarsStore.pendingAvatarsRequests.has(userId)).toBe(false)
        }
      })
    })

    it('should handle canceling non-existent request', () => {
      getWrapper({
        setup: ({ cancelAvatar }) => {
          expect(() => cancelAvatar('nonexistent')).not.toThrow()
        }
      })
    })

    it('should not update avatar when request is aborted', async () => {
      mockGetUserPhoto.mockImplementation(
        () => new Promise((_, reject) => setTimeout(() => reject({ name: 'AbortError' }), 100))
      )

      await getWrapper({
        setup: async ({ enqueueAvatar, cancelAvatar }) => {
          const avatarsStore = useAvatarsStore()
          const userId = 'user123'

          enqueueAvatar(userId)
          cancelAvatar(userId)

          await new Promise((resolve) => setTimeout(resolve, 150))

          expect(avatarsStore.getAvatar(userId)).toBeUndefined()
        }
      })
    })

    it('should handle CanceledError from axios', async () => {
      mockGetUserPhoto.mockImplementation(
        () => new Promise((_, reject) => setTimeout(() => reject({ name: 'CanceledError' }), 100))
      )

      await getWrapper({
        setup: async ({ enqueueAvatar, cancelAvatar }) => {
          const avatarsStore = useAvatarsStore()
          const userId = 'user123'

          enqueueAvatar(userId)
          cancelAvatar(userId)

          await new Promise((resolve) => setTimeout(resolve, 150))

          expect(avatarsStore.getAvatar(userId)).toBeUndefined()
        }
      })
    })
  })
})

function getWrapper({
  setup
}: {
  setup: (instance: ReturnType<typeof useLoadAvatars>) => void | Promise<void>
}) {
  return {
    wrapper: getComposableWrapper(
      () => {
        const instance = useLoadAvatars()
        setup(instance)
      },
      { pluginOptions: { pinia: false } }
    )
  }
}
