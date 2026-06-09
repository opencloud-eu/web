import { computed, unref } from 'vue'
import { SearchResult } from '../../components'
import { DavProperties } from '@opencloud-eu/web-client/webdav'
import { call } from '@opencloud-eu/web-client'
import { useClientService } from '../clientService'
import { isProjectSpaceResource } from '@opencloud-eu/web-client'
import {
  useCapabilityStore,
  useExtensionRegistry,
  useResourcesStore,
  useSpacesStore
} from '../piniaStores'
import { SearchResource } from '@opencloud-eu/web-client'
import { useTask } from 'vue-concurrency'
import { getVaultClaim, markVaultStatus } from '../../helpers/folderVault'

export const useSearch = () => {
  const clientService = useClientService()
  const spacesStore = useSpacesStore()
  const resourcesStore = useResourcesStore()
  const capabilityStore = useCapabilityStore()
  const extensionRegistry = useExtensionRegistry()
  // Light, throw-free space lookup by storage id straight from the spaces
  // store. Best-effort on purpose: if the space isn't loaded (e.g. a share
  // space that getMatchingSpace would synthesize on the fly), this returns
  // undefined, the claim below stays null and the hit is simply kept rather
  // than dropped - an acceptable filter miss that avoids running the heavier
  // getMatchingSpace on every single search result.
  const findSpaceById = (storageId: string) => spacesStore.spaces.find((s) => s.id === storageId)

  const fullTextSearchEnabled = computed(() => capabilityStore.searchContent?.enabled)
  const areHiddenFilesShown = computed(() => resourcesStore.areHiddenFilesShown)
  const projectSpaces = computed(() => spacesStore.spaces.filter(isProjectSpaceResource))
  const getProjectSpace = (id: string) => {
    return unref(projectSpaces).find((s) => s.id === id)
  }

  const searchTask = useTask(function* (signal, term: string, searchLimit: number = null) {
    if (!term) {
      return {
        totalResults: null,
        values: []
      }
    }

    const { resources, totalResults } = yield* call(
      clientService.webdav.search(term, {
        searchLimit,
        davProperties: DavProperties.Default,
        signal
      })
    )

    return {
      totalResults,
      values: resources
        .filter((resource) => {
          // Drop encrypted vault *content*: when the scheme encrypts names, a hit
          // below the vault root has a ciphertext server name - it's gibberish to
          // show and a clear-text query can't match it anyway. The clear-text
          // vault root itself is KEPT (and flagged below) so users can still find
          // their vaults by name. Content-only schemes keep all hits. Sync and
          // engine-free via the claim.
          const space = findSpaceById(resource.storageId)
          const claim = space ? getVaultClaim(extensionRegistry, space, resource.path) : null
          return !claim?.encryptsNames || claim.vaultRoot === resource.path
        })
        .map((resource) => {
          const matchingSpace = getProjectSpace(resource.parentFolderId)
          const data = (matchingSpace ? matchingSpace : resource) as SearchResource

          // A surfaced vault root is a normal clear-text folder; flag it so the
          // share/copy/move guards engage and it can't be exfiltrated from here.
          const space = findSpaceById(resource.storageId)
          if (space) {
            markVaultStatus(extensionRegistry, space, [data])
          }

          return { id: data.id, data }
        })
        .filter(({ data }) => {
          // filter results if hidden files shouldn't be shown due to settings
          return !data.name.startsWith('.') || unref(areHiddenFilesShown)
        })
    }
  }).restartable()

  const search = async (term: string, searchLimit: number = null): Promise<SearchResult> => {
    return await searchTask.perform(term, searchLimit)
  }

  const buildSearchTerm = ({
    term,
    isTitleOnlySearch,
    tags,
    lastModified,
    mediaType,
    scope,
    useScope
  }: {
    term: string
    isTitleOnlySearch?: boolean
    tags?: string
    lastModified?: string
    mediaType?: string
    scope?: string
    useScope?: boolean
  }) => {
    const query: string[] = []

    const humanSearchTerm = term
    const useFullTextSearch = unref(fullTextSearchEnabled) && !isTitleOnlySearch

    if (!!humanSearchTerm) {
      let nameQuery = `name:"*${humanSearchTerm}*"`

      if (useFullTextSearch) {
        nameQuery = `(name:"*${humanSearchTerm}*" OR content:"${humanSearchTerm}")`
      }

      query.push(nameQuery)
    }

    if (useScope && scope) {
      query.push(`scope:${scope}`)
    }

    if (tags) {
      const tagArr = tags.split('+').map((t) => `"${t}"`)
      query.push(`tag:(${tagArr.join(' OR ')})`)
    }

    if (lastModified) {
      query.push(`mtime:${lastModified}`)
    }

    if (mediaType) {
      const mediatypes = mediaType.split('+').map((t) => `"${t}"`)
      query.push(`mediatype:(${mediatypes.join(' OR ')})`)
    }
    return query
      .sort((a, b) => Number(a.startsWith('scope:')) - Number(b.startsWith('scope:')))
      .join(' AND ')
  }

  return {
    search,
    buildSearchTerm
  }
}

export type SearchFunction = ReturnType<typeof useSearch>['search']
