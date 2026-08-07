import { onBeforeUnmount, ref, unref, type Ref } from 'vue'
import {
  type CollaboratorShare,
  type Resource,
  ShareTypes,
  type SpaceResource,
  urlJoin
} from '@opencloud-eu/web-client'
import type { MentionItem } from '../../editor/types'
import { useClientService } from '../clientService'
import { useConfigStore, useSharesStore, useUserStore } from '../piniaStores'
import { useLoadShares } from '../shares'

type LoadSharesTask = ReturnType<typeof useLoadShares>['loadSharesTask']

function mentionLabel({ displayName, id }: CollaboratorShare['sharedWith']): string {
  return displayName || id
}

export function useMentionUsers({
  space,
  resource,
  loadSharesTask: providedLoadSharesTask
}: {
  space: Ref<SpaceResource>
  resource: Ref<Resource>
  loadSharesTask?: LoadSharesTask
}) {
  const { httpAuthenticated } = useClientService()
  const configStore = useConfigStore()
  const sharesStore = useSharesStore()
  const userStore = useUserStore()
  const loadSharesTask = providedLoadSharesTask || useLoadShares().loadSharesTask

  const collaborators = ref<CollaboratorShare[]>([])
  const collaboratorsFetched = ref(false)
  const selectedUserIds = ref<string[]>([])

  let pendingCollaborators: Promise<CollaboratorShare[]> | null = null

  function loadCollaborators(): Promise<CollaboratorShare[]> {
    if (unref(collaboratorsFetched)) {
      return Promise.resolve(unref(collaborators))
    }

    if (!pendingCollaborators) {
      const taskInstance = loadSharesTask.perform({
        space: unref(space),
        resource: unref(resource),
        updateStore: false,
        includeInheritedShares: true
      })

      const request: Promise<CollaboratorShare[]> = taskInstance
        .then(({ collaboratorShares }) => {
          collaborators.value = collaboratorShares
          collaboratorsFetched.value = true
          return collaboratorShares
        })
        .catch((error) => {
          if (!taskInstance.isCanceled) {
            console.error('Error loading collaborators for mentions', error)
          }
          if (pendingCollaborators === request) {
            pendingCollaborators = null
          }
          return [] as CollaboratorShare[]
        })

      pendingCollaborators = request
    }

    return pendingCollaborators
  }

  async function getMentionUsers(query: string): Promise<MentionItem[]> {
    const loadedCollaborators = await loadCollaborators()

    const normalizedQuery = query.toLowerCase()
    const individualShareTypeValues = ShareTypes.individuals.map(({ value }) => value)

    return loadedCollaborators
      .filter(({ shareType, sharedWith }) => {
        if (!individualShareTypeValues.includes(shareType) || !sharedWith.id) {
          return false
        }
        if (sharedWith.id === userStore.user?.id) {
          return false
        }
        return mentionLabel(sharedWith).toLowerCase().includes(normalizedQuery)
      })
      .filter(
        ({ sharedWith }, index, all) =>
          index === all.findIndex(({ sharedWith: candidate }) => candidate.id === sharedWith.id)
      )
      .map(({ sharedWith }) => ({ id: sharedWith.id, label: mentionLabel(sharedWith) }))
  }

  function selectMentionUser(userId: string): void {
    if (!unref(selectedUserIds).includes(userId)) {
      selectedUserIds.value.push(userId)
    }
  }

  async function notifyMentionedUsers(): Promise<void> {
    if (!unref(selectedUserIds).length) {
      return
    }

    const userIDs = [...unref(selectedUserIds)]
    selectedUserIds.value = []

    try {
      await httpAuthenticated.post(urlJoin(configStore.serverUrl, 'collaboration/notify'), {
        fileID: unref(resource).fileId,
        userIDs,
        type: 'mention'
      })
    } catch (error) {
      console.error('Error notifying mentioned users', error)
    }
  }

  function invalidateCollaborators(): void {
    if (loadSharesTask.isRunning) {
      loadSharesTask.cancelAll()
    }
    pendingCollaborators = null
    collaborators.value = []
    collaboratorsFetched.value = false
  }

  function resetMentionState(): void {
    invalidateCollaborators()
    selectedUserIds.value = []
  }

  const unsubscribeShareActions = sharesStore.$onAction(({ after, name }) => {
    after(() => {
      if (['addShare', 'removeShare'].includes(name)) {
        invalidateCollaborators()
      }
    })
  })

  onBeforeUnmount(unsubscribeShareActions)

  return {
    getMentionUsers,
    notifyMentionedUsers,
    resetMentionState,
    selectMentionUser
  }
}
