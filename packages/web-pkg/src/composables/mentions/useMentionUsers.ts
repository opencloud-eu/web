import { onBeforeUnmount, ref, unref, type Ref } from 'vue'
import {
  type CollaboratorShare,
  type Resource,
  ShareTypes,
  type SpaceResource
} from '@opencloud-eu/web-client'
import type { MentionItem } from '../../editor/types'
import { useClientService } from '../clientService'
import { useSharesStore, useUserStore } from '../piniaStores'
import { useLoadShares } from '../shares'

// the app an activity notification comes from, the server only accepts ids it knows
const WEBOFFICE_APP_ID = '8d1c9c88-9e2c-4d0b-9a1e-6a9de1cb9d3c'

function mentionLabel({ displayName, id }: CollaboratorShare['sharedWith']): string {
  return displayName || id
}

export function useMentionUsers({
  space,
  resource
}: {
  space: Ref<SpaceResource>
  resource: Ref<Resource>
}) {
  const { graphAuthenticated } = useClientService()
  const sharesStore = useSharesStore()
  const userStore = useUserStore()
  const { loadSharesTask } = useLoadShares()

  const collaborators = ref<CollaboratorShare[]>([])
  const collaboratorsFetched = ref(false)
  const selectedUserIds = ref<string[]>([])

  let pendingCollaborators: Promise<CollaboratorShare[]> | null = null
  let mentionStateVersion = 0

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
    const stateVersion = mentionStateVersion
    selectedUserIds.value = []

    // the endpoint takes one recipient, so every mentioned user gets a request
    const failedUserIDs: string[] = []
    await Promise.all(
      userIDs.map(async (userID) => {
        try {
          await graphAuthenticated.users.sendActivityNotification(userID, {
            topic: { source: 'text', value: unref(resource).id },
            activityType: 'mentioned',
            teamsAppId: WEBOFFICE_APP_ID
          })
        } catch (error) {
          console.error('Error notifying mentioned user', error)
          failedUserIDs.push(userID)
        }
      })
    )

    if (!failedUserIDs.length || stateVersion !== mentionStateVersion) {
      // the mention state has been reset in the meantime, e.g. because another resource
      // is being edited now. those mentions must not be notified anymore.
      return
    }

    // keep the failed users selected, so they are retried with the next notification
    selectedUserIds.value = [
      ...failedUserIDs,
      ...unref(selectedUserIds).filter((id) => !failedUserIDs.includes(id))
    ]
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
    mentionStateVersion++
    selectedUserIds.value = []
  }

  const unsubscribeShareActions = sharesStore.$onAction(({ after, name }) => {
    after(() => {
      if (['addShare', 'deleteShare'].includes(name)) {
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
