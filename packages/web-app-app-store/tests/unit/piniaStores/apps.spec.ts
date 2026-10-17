import { createPinia, setActivePinia } from 'pinia'
import { useAppsStore, useRepositoriesStore } from '../../../src/piniaStores'

const repos = [
  { name: 'first', url: 'https://first.example.com/apps.json' },
  { name: 'second', url: 'https://second.example.com/apps.json' }
]

const rawApp = {
  id: 'app',
  name: 'App',
  subtitle: 'subtitle',
  license: 'MIT',
  versions: [{ version: '1.0.0', url: 'https://example.com/app.zip' }],
  authors: [{ name: 'author' }],
  tags: ['tag']
}

function okResponse() {
  return new Response(JSON.stringify({ apps: [rawApp] }), { status: 200 })
}

function errorResponse() {
  return new Response(JSON.stringify({ apps: [] }), { status: 500 })
}

function invalidSchemaResponse() {
  return new Response(JSON.stringify({ apps: {} }), { status: 200 })
}

function invalidJsonResponse() {
  return new Response('not json', { status: 200 })
}

function networkError() {
  return Promise.reject(new TypeError('Failed to fetch'))
}

type ResponseFactories = Record<string, () => Response | Promise<Response>>

function getStore(responses: ResponseFactories) {
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string) => responses[url]())
  )
  useRepositoriesStore().setRepositories(repos)
  return useAppsStore()
}

describe('useAppsStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('loads apps without optional metadata and provides defaults for the UI', async () => {
    const minimalApp = { id: 'minimal', name: 'Minimal app', versions: rawApp.versions }
    const store = getStore({
      [repos[0].url]: () => new Response(JSON.stringify({ apps: [minimalApp, rawApp] })),
      [repos[1].url]: () => new Response(JSON.stringify({ apps: [] }))
    })

    await store.loadApps()

    expect(store.loadingFailed).toBe(false)
    expect(store.apps).toHaveLength(2)
    expect(store.getById('minimal')).toMatchObject({
      name: 'Minimal app',
      subtitle: '',
      authors: [],
      tags: [],
      mostRecentVersion: rawApp.versions[0],
      repository: repos[0]
    })
    expect(store.getById('minimal').license).toBeUndefined()
    expect(console.warn).not.toHaveBeenCalled()
    expect(console.error).not.toHaveBeenCalled()
  })

  it.each([
    ['missing id', { ...rawApp, id: undefined }],
    ['empty id', { ...rawApp, id: '' }],
    ['missing name', { ...rawApp, name: undefined }],
    ['empty name', { ...rawApp, name: '' }],
    ['incorrect name type', { ...rawApp, name: 123 }],
    ['missing versions', { ...rawApp, versions: undefined }],
    ['missing version number', { ...rawApp, versions: [{ url: rawApp.versions[0].url }] }],
    ['missing download URL', { ...rawApp, versions: [{ version: '1.0.0' }] }],
    ['null entry', null]
  ])('keeps valid apps when another entry has %s', async (_reason, invalidApp) => {
    const store = getStore({
      [repos[0].url]: () => new Response(JSON.stringify({ apps: [invalidApp, rawApp] })),
      [repos[1].url]: okResponse
    })

    await store.loadApps()

    expect(store.loadingFailed).toBe(false)
    expect(store.apps.map(({ id, repository }) => [id, repository.name])).toEqual([
      ['app', 'first'],
      ['app', 'second']
    ])
    expect(console.warn).toHaveBeenCalledExactlyOnceWith(
      expect.stringContaining(repos[0].url),
      expect.objectContaining({ name: 'ZodError' })
    )
    expect(console.error).not.toHaveBeenCalled()
  })

  it('marks loading as failed when all entries in every repository are invalid', async () => {
    const invalidAppsResponse = () => new Response(JSON.stringify({ apps: [{}] }))
    const store = getStore({
      [repos[0].url]: invalidAppsResponse,
      [repos[1].url]: invalidAppsResponse
    })

    await store.loadApps()

    expect(store.apps).toEqual([])
    expect(store.loadingFailed).toBe(true)
    expect(console.warn).toHaveBeenCalledTimes(2)
  })

  it('accepts a valid empty repository', async () => {
    const store = getStore({
      [repos[0].url]: () => new Response(JSON.stringify({ apps: [] })),
      [repos[1].url]: errorResponse
    })

    await store.loadApps()

    expect(store.apps).toEqual([])
    expect(store.loadingFailed).toBe(false)
    expect(console.warn).not.toHaveBeenCalled()
  })

  it('marks loading as failed when all repositories fail', async () => {
    const store = getStore({ [repos[0].url]: errorResponse, [repos[1].url]: networkError })
    await store.loadApps()
    expect(store.loadingFailed).toBe(true)
    expect(store.apps).toEqual([])
  })

  it('marks loading as failed when all repositories return invalid app lists', async () => {
    const store = getStore({
      [repos[0].url]: invalidSchemaResponse,
      [repos[1].url]: invalidJsonResponse
    })
    await store.loadApps()
    expect(store.loadingFailed).toBe(true)
    expect(store.apps).toEqual([])
  })

  it('keeps the apps of repositories that loaded when others fail', async () => {
    const store = getStore({ [repos[0].url]: okResponse, [repos[1].url]: errorResponse })
    await store.loadApps()
    expect(store.loadingFailed).toBe(false)
    expect(store.apps.map(({ id, repository }) => [id, repository.name])).toEqual([
      ['app', 'first']
    ])
  })

  it('resets the failed state when loading again succeeds', async () => {
    const responses: ResponseFactories = {
      [repos[0].url]: errorResponse,
      [repos[1].url]: errorResponse
    }
    const store = getStore(responses)
    await store.loadApps()
    expect(store.loadingFailed).toBe(true)

    responses[repos[0].url] = okResponse
    await store.loadApps()
    expect(store.loadingFailed).toBe(false)
    expect(store.apps).toHaveLength(1)
  })
})
