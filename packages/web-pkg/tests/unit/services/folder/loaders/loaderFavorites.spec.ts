import { mock } from 'vitest-mock-extended'
import { defaultComponentMocks, getComposableWrapper } from '@opencloud-eu/web-test-helpers'
import type { RouteLocation } from 'vue-router'
import { FolderLoaderFavorites, type TaskContext } from '../../../../../src/services/folder'
import {
  useCapabilityStore,
  useConfigStore,
  useResourcesStore,
  useSharesStore,
  useSpacesStore,
  useUserStore,
  type AuthServiceInterface,
  type ExtensionRegistry
} from '../../../../../src/composables'

describe('FolderLoaderFavorites', () => {
  it('only searches for favorites without filters', async () => {
    const { search } = await loadFavorites({})
    expect(search).toHaveBeenCalledWith('is:favorite', expect.anything())
  })
  it('filters by tags', async () => {
    const { search } = await loadFavorites({ q_tags: 'work+private' })
    expect(search).toHaveBeenCalledWith(
      'tag:("work" OR "private") AND is:favorite',
      expect.anything()
    )
  })
  it('doubles quotes in tag filters', async () => {
    const { search } = await loadFavorites({ q_tags: 'a"b+c' })
    expect(search).toHaveBeenCalledWith('tag:("a""b" OR "c") AND is:favorite', expect.anything())
  })
  it('combines the tag filter with the other filters', async () => {
    const { search } = await loadFavorites({
      q_lastModified: 'today',
      q_mediaType: 'image',
      q_tags: 'work'
    })
    expect(search).toHaveBeenCalledWith(
      'mtime:today AND mediatype:("image") AND tag:("work") AND is:favorite',
      expect.anything()
    )
  })
  it('uses the filters of the favorites list when opened from it, e.g. in the preview', async () => {
    const { search } = await loadFavorites(
      {
        contextRouteName: 'files-common-favorites',
        contextRouteQuery: { q_mediaType: 'image', q_tags: 'work' }
      },
      'preview'
    )
    expect(search).toHaveBeenCalledWith(
      'mediatype:("image") AND tag:("work") AND is:favorite',
      expect.anything()
    )
  })
})

async function loadFavorites(
  query: Record<string, string | Record<string, string>>,
  routeName = 'files-common-favorites'
) {
  const mocks = defaultComponentMocks({
    currentRoute: { name: routeName, query } as unknown as RouteLocation
  })
  mocks.$clientService.webdav.search.mockResolvedValue({ resources: [], totalResults: 0 })

  let task!: ReturnType<FolderLoaderFavorites['getTask']>

  getComposableWrapper(
    () => {
      const context: TaskContext = {
        router: mocks.$router,
        clientService: mocks.$clientService,
        resourcesStore: useResourcesStore(),
        spacesStore: useSpacesStore(),
        sharesStore: useSharesStore(),
        configStore: useConfigStore(),
        userStore: useUserStore(),
        capabilityStore: useCapabilityStore(),
        authService: mock<AuthServiceInterface>(),
        extensionRegistry: mock<ExtensionRegistry>()
      }
      task = new FolderLoaderFavorites().getTask(context)
    },
    { mocks, provide: mocks }
  )

  await task.perform(new AbortController().signal)
  return { search: mocks.$clientService.webdav.search }
}
