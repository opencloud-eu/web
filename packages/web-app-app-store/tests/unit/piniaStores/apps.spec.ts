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
  return new Response(JSON.stringify({ apps: [{}] }), { status: 200 })
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
  })
  afterEach(() => {
    vi.unstubAllGlobals()
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
