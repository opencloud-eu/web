import { computed, onScopeDispose, ref, unref } from 'vue'
import { debounce } from 'lodash-es'
import * as EmailValidator from 'email-validator'
import { useTask } from 'vue-concurrency'
import { useGettext } from 'vue3-gettext'
import { call, CollaboratorAutoCompleteItem, ShareTypes } from '@opencloud-eu/web-client'
import { Contact } from '@opencloud-eu/web-client/ox'
import {
  useAbility,
  useCapabilityStore,
  useClientService,
  useMessages
} from '@opencloud-eu/web-pkg'

export const useCollaboratorSearch = () => {
  const clientService = useClientService()
  const capabilityStore = useCapabilityStore()
  const { can } = useAbility()

  const canInviteGuests = computed(
    () => capabilityStore.sharingGuestLinksEnabled && can('create-all', 'GuestInvite')
  )

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
   * Guest invites for `query` if it is a mail address and for the address book
   * `contacts`, leaving out addresses that belong to one of the `collaborators`.
   */
  function getGuestCandidates(
    query: string,
    collaborators: CollaboratorAutoCompleteItem[],
    contacts: Contact[] = []
  ): CollaboratorAutoCompleteItem[] {
    if (!unref(canInviteGuests)) {
      return []
    }

    const trimmedQuery = (query || '').trim()
    const queryCandidate = getGuestCandidate(
      trimmedQuery,
      trimmedQuery.toLowerCase(),
      collaborators
    )
    const contactCandidates = contacts.map((contact) => {
      const candidate = getGuestCandidate(contact.email, contact.displayName, collaborators)
      return candidate && { ...candidate, mail: candidate.id }
    })

    const candidates = new Map<string, CollaboratorAutoCompleteItem>()
    ;[queryCandidate, ...contactCandidates].filter(Boolean).forEach((candidate) => {
      candidates.set(candidate.id, candidate)
    })
    return [...candidates.values()]
  }

  function getGuestCandidate(
    address: string,
    displayName: string,
    collaborators: CollaboratorAutoCompleteItem[]
  ): CollaboratorAutoCompleteItem | undefined {
    const email = getCanonicalEmail(address)
    if (
      !email ||
      emailBelongsToAccount(address, collaborators) ||
      emailBelongsToAccount(email, collaborators)
    ) {
      return undefined
    }
    return { id: email, displayName: displayName || email, shareType: ShareTypes.guest.value }
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

  return { canInviteGuests, searchCollaborators, getGuestCandidates }
}

/**
 * `email` the way the server stores guest addresses: domain in punycode and
 * lower-cased. Undefined if it isn't a plain mail address.
 */
function getCanonicalEmail(email: string) {
  const at = email.lastIndexOf('@')
  const domain = email.slice(at + 1)
  // the URL parser would drop or reinterpret anything like a port or path
  if (at < 0 || !/^([a-z0-9.-]|\P{ASCII})+$/iu.test(domain)) {
    return undefined
  }
  let asciiDomain: string
  try {
    asciiDomain = new URL(`http://${domain}`).hostname
  } catch {
    return undefined
  }
  const address = `${email.slice(0, at)}@${asciiDomain}`
  // the validator doesn't allow `--` in the top-level domain, so punycode ones would fail
  if (!EmailValidator.validate(address.replace(/\.xn--([a-z0-9-]+)$/i, '.xn$1'))) {
    return undefined
  }
  return address.toLowerCase()
}

/**
 * `fetchResults` returns the list to show, so each caller decides which sources
 * it searches and who it leaves out. `inputId` is the search input the results
 * belong to.
 */
export const useCollaboratorAutocomplete = (
  inputId: string,
  fetchResults: (query: string, signal: AbortSignal) => Promise<CollaboratorAutoCompleteItem[]>
) => {
  const capabilityStore = useCapabilityStore()
  const { showErrorMessage } = useMessages()
  const { $gettext } = useGettext()

  const searchQuery = ref('')
  const searchInProgress = ref(false)
  // a failed search has no results to show, so the list mustn't claim that nobody matched
  const searchFailed = ref(false)
  const autocompleteResults = ref<CollaboratorAutoCompleteItem[]>([])
  const minSearchLength = computed(() => capabilityStore.sharingSearchMinLength)

  const fetchRecipientsTask = useTask(function* (signal, query: string) {
    try {
      autocompleteResults.value = yield* call(fetchResults(query, signal))
    } catch (e) {
      console.error(e)
      searchFailed.value = true
      if (isSearchShown(query)) {
        showErrorMessage({
          title: $gettext('Failed to search for users and groups'),
          errors: [e]
        })
      }
    }
    searchInProgress.value = false
  }).restartable()

  const fetchRecipients = debounce((query: string) => {
    fetchRecipientsTask.perform(query)
  }, 500)

  onScopeDispose(() => fetchRecipients.cancel())

  /**
   * Whether the user still looks at the search for `query`: not after the input
   * got cleared, changed or left.
   */
  function isSearchShown(query: string) {
    const input = document.getElementById(inputId) as HTMLInputElement
    return (
      !!input &&
      document.activeElement === input &&
      input.value.trim() === query.trim() &&
      query.trim().length >= unref(minSearchLength)
    )
  }

  function onSearch(query: string) {
    fetchRecipients.cancel()
    fetchRecipientsTask.cancelAll()
    autocompleteResults.value = []
    searchFailed.value = false
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
    isSearchShown,
    minSearchLength,
    onSearch,
    searchFailed,
    searchInProgress,
    searchQuery
  }
}
