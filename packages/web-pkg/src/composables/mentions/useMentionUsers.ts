import { computed, onBeforeUnmount, ref, unref, type Ref } from 'vue'
import {
  type CollaboratorShare,
  type Resource,
  ShareTypes,
  type SpaceResource
} from '@opencloud-eu/web-client'
import { escapeRegExp } from 'lodash-es'
import type { MentionItem } from '../../editor/types'
import { useClientService } from '../clientService'
import { useSharesStore, useUserStore } from '../piniaStores'
import { useLoadShares } from '../shares'

// the app an activity notification comes from, the server only accepts ids it knows
const WEBOFFICE_APP_ID = '8d1c9c88-9e2c-4d0b-9a1e-6a9de1cb9d3c'

function mentionLabel({ displayName, id }: CollaboratorShare['sharedWith']): string {
  return displayName || id
}

function mentionedLabels(content: string, labels: string[]): Set<string> {
  // longest label first, so that `@Alice Smith` wins over `@Alice`
  const sorted = [...new Set(labels)].sort((a, b) => b.length - a.length)
  const pattern = new RegExp(

    `(?:^|[\\s"])@(${sorted.map(escapeRegExp).join('|')})(?![^\\s.,!?;:)}\\]"])`,
    'g'
  )

  return new Set(Array.from(content.matchAll(pattern), ([, label]) => label))
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
  const selectedMentions = ref<MentionItem[]>([])

  const ownMentionLabel = computed(() =>
    userStore.user ? mentionLabel(userStore.user) : undefined
  )

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

  function selectMentionUser(item: MentionItem): void {
    if (!unref(selectedMentions).some(({ id }) => id === item.id)) {
      selectedMentions.value.push(item)
    }
  }

  async function notifyMentionedUsers(content?: string): Promise<void> {
    if (!unref(selectedMentions).length) {
      return
    }

    const mentions = [...unref(selectedMentions)]
    const stateVersion = mentionStateVersion
    selectedMentions.value = []

    let recipients = mentions
    if (content !== undefined) {
      const stillMentioned = mentionedLabels(content, [
        ...mentions.map(({ label }) => label),
        ...unref(collaborators).map(({ sharedWith }) => mentionLabel(sharedWith))
      ])
      recipients = mentions.filter(({ label }) => stillMentioned.has(label))
    }
    if (!recipients.length) {
      return
    }

    // the endpoint takes one recipient, so every mentioned user gets a request
    const failedMentions: MentionItem[] = []
    await Promise.all(
      recipients.map(async ({ id: userID, label }) => {
        try {
          await graphAuthenticated.users.sendActivityNotification(userID, {
            topic: { source: 'text', value: unref(resource).id },
            activityType: 'mentioned',
            teamsAppId: WEBOFFICE_APP_ID
          })
        } catch (error) {
          console.error('Error notifying mentioned user', error)
          failedMentions.push({ id: userID, label })
        }
      })
    )

    if (!failedMentions.length || stateVersion !== mentionStateVersion) {
      // the mention state has been reset in the meantime, e.g. because another resource
      // is being edited now. those mentions must not be notified anymore.
      return
    }

    // keep the failed users selected, so they are retried with the next notification
    const failedIds = failedMentions.map(({ id }) => id)
    selectedMentions.value = [
      ...failedMentions,
      ...unref(selectedMentions).filter(({ id }) => !failedIds.includes(id))
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
    selectedMentions.value = []
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
    ownMentionLabel,
    resetMentionState,
    selectMentionUser
  }
}
