import { computed, onScopeDispose, ref, unref } from 'vue'
import { debounce } from 'lodash-es'
import * as EmailValidator from 'email-validator'
import { useTask } from 'vue-concurrency'
import { call, CollaboratorAutoCompleteItem, ShareTypes } from '@opencloud-eu/web-client'
import { useAbility, useCapabilityStore, useClientService } from '@opencloud-eu/web-pkg'

export const useCollaboratorSearch = () => {
  const clientService = useClientService()
  const { can } = useAbility()

  /**
   * Users and groups matching `query`, each tagged with the share type it would
   * be invited with. An external search looks at federated users only - groups
   * don't federate.
   */
  async function searchCollaborators(
    query: string,
    { signal, external = false }: { signal?: AbortSignal; external?: boolean } = {}
  ): Promise<CollaboratorAutoCompleteItem[]> {
    const client = clientService.graphAuthenticated
    const search = `"${query.trim()}"`

    const userData = await client.users.listUsers(
      {
        orderBy: ['displayName'],
        search,
        ...(external && { filter: `(userType eq 'Federated')` })
      },
      { signal }
    )
    const groupData = external
      ? []
      : await client.groups.listGroups({ orderBy: ['displayName'], search }, { signal })

    return [
      ...(userData || []).map((user) => ({
        ...user,
        shareType: external ? ShareTypes.remote.value : ShareTypes.user.value
      })),
      ...(groupData || []).map((group) => ({ ...group, shareType: ShareTypes.group.value }))
    ] as CollaboratorAutoCompleteItem[]
  }

  /**
   * A guest invite for `query` if it is a mail address that doesn't belong to
   * one of the `collaborators` found for it.
   */
  function getGuestCandidates(
    query: string,
    collaborators: CollaboratorAutoCompleteItem[]
  ): CollaboratorAutoCompleteItem[] {
    const trimmedQuery = (query || '').trim()
    if (
      !can('create-all', 'GuestInvite') ||
      !EmailValidator.validate(trimmedQuery) ||
      emailBelongsToAccount(trimmedQuery, collaborators)
    ) {
      return []
    }
    return [{ id: trimmedQuery, displayName: trimmedQuery, shareType: ShareTypes.guest.value }]
  }

  function emailBelongsToAccount(email: string, collaborators: CollaboratorAutoCompleteItem[]) {
    const users = collaborators.filter(({ shareType }) => shareType === ShareTypes.user.value)
    if (users.length === 1 && !users[0].mail) {
      return true
    }
    return collaborators.some((c) =>
      [c.mail?.toLowerCase(), c.onPremisesSamAccountName?.toLowerCase()].includes(
        email.toLowerCase()
      )
    )
  }

  return { searchCollaborators, getGuestCandidates }
}

/**
 * `fetchResults` returns the list to show, so each caller decides which sources
 * it searches and who it leaves out.
 */
export const useCollaboratorAutocomplete = (
  fetchResults: (query: string, signal: AbortSignal) => Promise<CollaboratorAutoCompleteItem[]>
) => {
  const capabilityStore = useCapabilityStore()

  const searchQuery = ref('')
  const searchInProgress = ref(false)
  const autocompleteResults = ref<CollaboratorAutoCompleteItem[]>([])
  const minSearchLength = computed(() => capabilityStore.sharingSearchMinLength)

  const fetchRecipientsTask = useTask(function* (signal, query: string) {
    try {
      autocompleteResults.value = yield* call(fetchResults(query, signal))
    } catch (e) {
      console.error(e)
    }
    searchInProgress.value = false
  }).restartable()

  const fetchRecipients = debounce((query: string) => {
    fetchRecipientsTask.perform(query)
  }, 500)

  onScopeDispose(() => fetchRecipients.cancel())

  function onSearch(query: string) {
    fetchRecipients.cancel()
    fetchRecipientsTask.cancelAll()
    autocompleteResults.value = []
    searchQuery.value = query

    if (query.trim().length < unref(minSearchLength)) {
      searchInProgress.value = false
      return
    }

    searchInProgress.value = true
    fetchRecipients(query)
  }

  return {
    autocompleteResults,
    minSearchLength,
    onSearch,
    searchInProgress,
    searchQuery
  }
}
