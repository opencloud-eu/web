import { ref, type Ref } from 'vue'
import { mock } from 'vitest-mock-extended'
import { flushPromises } from '@vue/test-utils'
import { defaultComponentMocks, getComposableWrapper } from '@opencloud-eu/web-test-helpers'
import {
  type CollaboratorShare,
  type Resource,
  ShareTypes,
  type SpaceResource
} from '@opencloud-eu/web-client'
import type { User } from '@opencloud-eu/web-client/graph/generated'
import { useMentionUsers } from '../../../../src/composables/mentions/useMentionUsers'
import { useSharesStore } from '../../../../src/composables/piniaStores'
import { useLoadShares } from '../../../../src/composables/shares/useLoadShares'

vi.mock('../../../../src/composables/shares/useLoadShares')

function collaboratorShare(
  id: string,
  displayName: string,
  shareType = ShareTypes.user.value
): CollaboratorShare {
  return mock<CollaboratorShare>({ shareType, sharedWith: { id, displayName } })
}

describe('useMentionUsers', () => {
  describe('getMentionUsers', () => {
    it('requests the full inherited share list', async () => {
      const { instance, loadSharesTask } = getWrapper()

      await instance.getMentionUsers('')

      expect(loadSharesTask.perform).toHaveBeenCalledWith(
        expect.objectContaining({ updateStore: false, includeInheritedShares: true })
      )
    })

    it('filters by display name, keeps individual share types only and deduplicates', async () => {
      const { instance } = getWrapper({
        collaboratorShares: [
          collaboratorShare('user1', 'Alice Smith'),
          collaboratorShare('user1', 'Alice Smith'),
          collaboratorShare('user2', 'Bob Jones'),
          collaboratorShare('group1', 'Alice Admins', ShareTypes.group.value)
        ]
      })

      await expect(instance.getMentionUsers('alice')).resolves.toEqual([
        { id: 'user1', label: 'Alice Smith' }
      ])
    })

    it.each([undefined, ''])(
      'falls back to the user id and matches on it when displayName is %o',
      async (displayName) => {
        const { instance } = getWrapper({
          collaboratorShares: [
            mock<CollaboratorShare>({
              shareType: ShareTypes.user.value,
              sharedWith: { id: 'user1', displayName }
            })
          ]
        })

        await expect(instance.getMentionUsers('use')).resolves.toEqual([
          { id: 'user1', label: 'user1' }
        ])
      }
    )

    it('excludes the current user', async () => {
      const { instance } = getWrapper({
        collaboratorShares: [
          collaboratorShare('own-id', 'Me Myself'),
          collaboratorShare('user2', 'Bob Jones')
        ],
        currentUserId: 'own-id'
      })

      await expect(instance.getMentionUsers('')).resolves.toEqual([
        { id: 'user2', label: 'Bob Jones' }
      ])
    })

    it('loads the shares only once for subsequent queries', async () => {
      const { instance, loadSharesTask } = getWrapper({
        collaboratorShares: [collaboratorShare('user1', 'Alice')]
      })

      await instance.getMentionUsers('a')
      await instance.getMentionUsers('al')

      expect(loadSharesTask.perform).toHaveBeenCalledOnce()
    })

    it('shares the in-flight request instead of restarting it on every query', async () => {
      const { instance, loadSharesTask, deferreds } = getWrapper({ deferred: true })

      const first = instance.getMentionUsers('a')
      const second = instance.getMentionUsers('al')
      await deferreds[0].resolve([collaboratorShare('user1', 'Alice')])

      await expect(first).resolves.toEqual([{ id: 'user1', label: 'Alice' }])
      await expect(second).resolves.toEqual([{ id: 'user1', label: 'Alice' }])
      expect(loadSharesTask.perform).toHaveBeenCalledOnce()
      expect(loadSharesTask.cancelAll).not.toHaveBeenCalled()
    })

    it('ignores a discarded request that settles while a newer one is running', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined)
      const { instance, loadSharesTask, deferreds } = getWrapper({ deferred: true })

      const discarded = instance.getMentionUsers('a')
      instance.resetMentionState()
      const current = instance.getMentionUsers('a')
      // the cancelled request settles only after the follow-up request was started
      await deferreds[0].reject(new Error('cancelled'))
      const reusing = instance.getMentionUsers('a')

      expect(loadSharesTask.perform).toHaveBeenCalledTimes(2)
      await expect(discarded).resolves.toEqual([])
      await deferreds[1].resolve([collaboratorShare('user1', 'Alice')])
      await expect(current).resolves.toEqual([{ id: 'user1', label: 'Alice' }])
      await expect(reusing).resolves.toEqual([{ id: 'user1', label: 'Alice' }])
    })

    it('returns an empty list and logs when loading the shares fails', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
      const { instance } = getWrapper({ rejectLoad: true })

      await expect(instance.getMentionUsers('')).resolves.toEqual([])
      expect(consoleError).toHaveBeenCalled()
    })

    it('retries loading the shares after a failure', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined)
      const { instance, loadSharesTask } = getWrapper({ rejectLoad: true })

      await instance.getMentionUsers('')
      await instance.getMentionUsers('')

      expect(loadSharesTask.perform).toHaveBeenCalledTimes(2)
    })
  })

  describe('notifyMentionedUsers', () => {
    it('posts the unique selected user ids and clears the list', async () => {
      const { instance, mocks } = getWrapper()

      instance.selectMentionUser('user1')
      instance.selectMentionUser('user2')
      instance.selectMentionUser('user1')
      await instance.notifyMentionedUsers()

      expect(mocks.$clientService.httpAuthenticated.post).toHaveBeenCalledWith(
        expect.stringContaining('/collaboration/notify'),
        { fileID: 'file-id', userIDs: ['user1', 'user2'], type: 'mention' }
      )

      await instance.notifyMentionedUsers()
      expect(mocks.$clientService.httpAuthenticated.post).toHaveBeenCalledOnce()
    })

    it('does not post without selected users', async () => {
      const { instance, mocks } = getWrapper()

      await instance.notifyMentionedUsers()

      expect(mocks.$clientService.httpAuthenticated.post).not.toHaveBeenCalled()
    })

    it('keeps selected users for a retry when notifying fails', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
      const { instance, mocks } = getWrapper()
      mocks.$clientService.httpAuthenticated.post
        .mockRejectedValueOnce(new Error('nope'))
        .mockResolvedValueOnce({} as never)

      instance.selectMentionUser('user1')
      await expect(instance.notifyMentionedUsers()).resolves.toBeUndefined()
      await instance.notifyMentionedUsers()

      expect(consoleError).toHaveBeenCalled()
      expect(mocks.$clientService.httpAuthenticated.post).toHaveBeenCalledTimes(2)
      expect(mocks.$clientService.httpAuthenticated.post).toHaveBeenLastCalledWith(
        expect.stringContaining('/collaboration/notify'),
        { fileID: 'file-id', userIDs: ['user1'], type: 'mention' }
      )
    })

    it('merges new selections into the retry after notifying fails', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined)
      const { instance, mocks } = getWrapper()
      let rejectPost!: (error: Error) => void
      mocks.$clientService.httpAuthenticated.post.mockReturnValueOnce(
        new Promise((_resolve, reject) => {
          rejectPost = reject
        }) as never
      )

      instance.selectMentionUser('user1')
      const notification = instance.notifyMentionedUsers()
      instance.selectMentionUser('user2')
      rejectPost(new Error('nope'))
      await notification
      mocks.$clientService.httpAuthenticated.post.mockResolvedValueOnce({} as never)

      await instance.notifyMentionedUsers()

      expect(mocks.$clientService.httpAuthenticated.post).toHaveBeenLastCalledWith(
        expect.stringContaining('/collaboration/notify'),
        { fileID: 'file-id', userIDs: ['user1', 'user2'], type: 'mention' }
      )
    })
  })

  describe('resetMentionState', () => {
    it('drops pending mentions so they are not notified for another resource', async () => {
      const { instance, mocks } = getWrapper()

      instance.selectMentionUser('user1')
      instance.resetMentionState()
      await instance.notifyMentionedUsers()

      expect(mocks.$clientService.httpAuthenticated.post).not.toHaveBeenCalled()
    })

    it('does not restore failed notifications after switching resources', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined)
      const { instance, mocks } = getWrapper()
      let rejectPost!: (error: Error) => void
      mocks.$clientService.httpAuthenticated.post.mockReturnValueOnce(
        new Promise((_resolve, reject) => {
          rejectPost = reject
        }) as never
      )

      instance.selectMentionUser('user1')
      const notification = instance.notifyMentionedUsers()
      instance.resetMentionState()
      rejectPost(new Error('nope'))
      await notification
      await instance.notifyMentionedUsers()

      expect(mocks.$clientService.httpAuthenticated.post).toHaveBeenCalledOnce()
    })

    it('cancels a running share request and reloads on the next query', async () => {
      const { instance, loadSharesTask } = getWrapper()

      await instance.getMentionUsers('')
      loadSharesTask.isRunning = true
      instance.resetMentionState()
      await instance.getMentionUsers('')

      expect(loadSharesTask.cancelAll).toHaveBeenCalledOnce()
      expect(loadSharesTask.perform).toHaveBeenCalledTimes(2)
    })
  })

  describe('shares store', () => {
    it.each(['addShare', 'deleteShare'])('reloads the collaborators after %s', async (action) => {
      const { instance, loadSharesTask, emitStoreAction } = getWrapper()

      await instance.getMentionUsers('')
      emitStoreAction(action)
      await instance.getMentionUsers('')

      expect(loadSharesTask.perform).toHaveBeenCalledTimes(2)
    })

    it('keeps the collaborators for unrelated store actions', async () => {
      const { instance, loadSharesTask, emitStoreAction } = getWrapper()

      await instance.getMentionUsers('')
      emitStoreAction('setLoading')
      await instance.getMentionUsers('')

      expect(loadSharesTask.perform).toHaveBeenCalledOnce()
    })

    it('unsubscribes from the store when the component unmounts', () => {
      const { wrapper, unsubscribe } = getWrapper()

      wrapper.unmount()

      expect(unsubscribe).toHaveBeenCalledOnce()
    })
  })
})

function getWrapper({
  collaboratorShares = [],
  currentUserId = 'own-id',
  deferred = false,
  rejectLoad = false,
  space = ref(mock<SpaceResource>({ id: 'space-id' })),
  resource = ref(mock<Resource>({ id: 'resource-id', fileId: 'file-id' })),
  mocks = defaultComponentMocks()
}: {
  collaboratorShares?: CollaboratorShare[]
  currentUserId?: string
  deferred?: boolean
  rejectLoad?: boolean
  space?: Ref<SpaceResource>
  resource?: Ref<Resource>
  mocks?: ReturnType<typeof defaultComponentMocks>
} = {}) {
  const deferreds: Array<{
    resolve: (shares: CollaboratorShare[]) => Promise<unknown>
    reject: (error: Error) => Promise<unknown>
  }> = []
  const loadSharesTask = {
    isRunning: false,
    cancelAll: vi.fn(),
    perform: vi.fn().mockImplementation(() => {
      if (rejectLoad) {
        return Promise.reject(new Error('failed'))
      }
      if (deferred) {
        return new Promise((resolve, reject) => {
          deferreds.push({
            resolve: (shares) => {
              resolve({ collaboratorShares: shares, linkShares: [] })
              return flushPromises()
            },
            reject: (error) => {
              reject(error)
              return flushPromises()
            }
          })
        })
      }
      return Promise.resolve({ collaboratorShares, linkShares: [] })
    })
  }
  vi.mocked(useLoadShares).mockReturnValue({
    loadSharesTask: loadSharesTask as never,
    availableInternalShareRoles: ref([]),
    availableExternalShareRoles: ref([])
  })

  let instance!: ReturnType<typeof useMentionUsers>
  // `stubActions` replaces the store actions, so they no longer notify `$onAction`
  // subscribers. Capture the subscriber instead to trigger it explicitly.
  const unsubscribe = vi.fn()
  let onActionSubscriber: (context: {
    name: string
    after: (callback: () => void) => void
  }) => void = () => undefined

  const wrapper = getComposableWrapper(
    () => {
      const sharesStore = useSharesStore()
      vi.spyOn(sharesStore, '$onAction').mockImplementation((subscriber) => {
        onActionSubscriber = subscriber as typeof onActionSubscriber
        return unsubscribe
      })

      instance = useMentionUsers({ space, resource })
    },
    {
      mocks,
      provide: mocks,
      pluginOptions: {
        piniaOptions: {
          userState: { user: mock<User>({ id: currentUserId }) }
        }
      }
    }
  )

  return {
    wrapper,
    instance,
    unsubscribe,
    deferreds,
    emitStoreAction: (name: string) =>
      onActionSubscriber({ name, after: (callback) => callback() }),
    loadSharesTask,
    mocks
  }
}
