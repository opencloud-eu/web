import { computed, ref, unref } from 'vue'
import { debounce } from 'lodash-es'
import { useTask } from 'vue-concurrency'
import { call, CollaboratorAutoCompleteItem, ShareTypes } from '@opencloud-eu/web-client'
import { useCapabilityStore, useClientService } from '@opencloud-eu/web-pkg'

export const useCollaboratorSearch = () => {
  const clientService = useClientService()

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
    const search = `"${query}"`

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

  return { searchCollaborators }
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
    autocompleteResults.value = yield* call(fetchResults(query, signal))
    searchInProgress.value = false
  }).restartable()

  const fetchRecipients = debounce((query: string) => {
    fetchRecipientsTask.perform(query)
  }, 500)

  function onSearch(query: string) {
    autocompleteResults.value = []
    searchQuery.value = query

    if (query.length < unref(minSearchLength)) {
      searchInProgress.value = false
      return
    }

    searchInProgress.value = true
    fetchRecipients(query)
  }

  /**
   * Narrows what the server returned to what the query actually matches.
   * Federated recipients stay in regardless - they are resolved by the server,
   * not by the text typed here.
   */
  function filterRecipients(recipients: CollaboratorAutoCompleteItem[], query: string) {
    if (!(query || '').trim()) {
      return recipients
    }

    // Allow advanced queries
    query = query.split(':')[1] || query

    return recipients.filter(
      (recipient) =>
        recipient.shareType === ShareTypes.remote.value ||
        recipient.displayName.toLocaleLowerCase().indexOf(query.toLocaleLowerCase()) > -1 ||
        recipient.mail?.toLocaleLowerCase().indexOf(query.toLocaleLowerCase()) > -1
    )
  }

  return {
    autocompleteResults,
    fetchRecipients,
    filterRecipients,
    minSearchLength,
    onSearch,
    searchInProgress,
    searchQuery
  }
}
