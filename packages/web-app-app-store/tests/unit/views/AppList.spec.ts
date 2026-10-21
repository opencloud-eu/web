import { createMemoryHistory, createRouter } from 'vue-router'
import { defaultPlugins, mount } from '@opencloud-eu/web-test-helpers'
import AppList from '../../../src/views/AppList.vue'
import { useAppsStore } from '../../../src/piniaStores'
import { App } from '../../../src/types'
import { APPID } from '../../../src/appid'

function createApp(id: string, name: string): App {
  const version = { version: '1.0.0', url: `https://example.com/${id}.zip` }
  return {
    id,
    name,
    subtitle: '',
    authors: [],
    official: false,
    tags: [],
    screenshots: [],
    resources: [],
    versions: [version],
    mostRecentVersion: version,
    repository: { name: 'repo', url: 'https://example.com/apps.json' }
  }
}

const apps = [createApp('com.example.first', 'First'), createApp('com.example.second', 'Second')]

describe('AppList', () => {
  let wrapper: Awaited<ReturnType<typeof getWrapper>>

  afterEach(() => {
    wrapper.unmount()
  })

  it('focuses the link of the last opened app when coming back from its details', async () => {
    wrapper = await getWrapper({ lastOpenedAppId: 'com.example.second' })
    expect(document.activeElement).toBe(
      wrapper.find('a[href="/app-store/app/com.example.second"]').element
    )
    expect(useAppsStore().lastOpenedAppId).toBeUndefined()
  })

  it('does not focus any app without a last opened app', async () => {
    wrapper = await getWrapper()
    expect(wrapper.findAll('a[href^="/app-store/app/"]')).toHaveLength(apps.length)
    expect(document.activeElement).toBe(document.body)
  })
})

async function getWrapper({ lastOpenedAppId }: { lastOpenedAppId?: string } = {}) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/app-store/list', name: `${APPID}-list`, component: {} },
      { path: '/app-store/app/:appId', name: `${APPID}-details`, component: {} }
    ]
  })
  await router.push({ name: `${APPID}-list` })

  const plugins = defaultPlugins()
  const appsStore = useAppsStore()
  appsStore.apps = apps
  appsStore.lastOpenedAppId = lastOpenedAppId

  return mount(AppList, {
    attachTo: document.body,
    global: { plugins: [...plugins, router], provide: { $router: router } }
  })
}
