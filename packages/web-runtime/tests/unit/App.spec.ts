import App from '../../src/App.vue'
import { eventBus, useAuthStore } from '@opencloud-eu/web-pkg'
import { createRouter, defaultPlugins, shallowMount } from '@opencloud-eu/web-test-helpers'
import { defineComponent, ref } from 'vue'

vi.mock('../../src/composables/layout', () => ({
  useLayout: () => ({ layout: ref('div'), layoutType: ref('application') })
}))

const getMetaContent = (property: string) =>
  document.querySelector<HTMLMetaElement>(`meta[property="${property}"]`)?.content

describe('App', () => {
  it('keeps media metadata when the title event arrives afterwards', async () => {
    const routeComponent = defineComponent({ template: '<div />' })
    const router = createRouter({
      routes: [
        {
          path: '/:pathMatch(.*)*',
          component: routeComponent
        },
        {
          path: '/spaces/generic/:pathMatch(.*)*',
          name: 'files-spaces-generic',
          component: routeComponent
        },
        {
          path: '/spaces/projects/:pathMatch(.*)*',
          name: 'files-spaces-projects',
          component: routeComponent
        }
      ]
    })
    await router.push('/preview')
    await router.isReady()

    shallowMount(App, {
      global: {
        plugins: [...defaultPlugins(), router],
        provide: { $router: router }
      }
    })
    eventBus.publish('runtime.openGraphMeta.changed', {
      title: 'foo.mp4',
      video: 'https://opencloud.test/foo.mp4',
      videoType: 'video/mp4'
    })

    const authStore = useAuthStore()
    authStore.publicLinkContextReady = true
    authStore.publicLinkToken = 'abcxyz'
    authStore.publicLinkType = 'public-link'
    eventBus.publish('runtime.documentTitle.changed', {
      shortDocumentTitle: 'foo.mp4 - Preview',
      fullDocumentTitle: 'foo.mp4 - Preview - OpenCloud'
    })

    expect(getMetaContent('og:title')).toBe('foo.mp4')
    expect(new URL(getMetaContent('og:url')).hash).toBe('#/s/abcxyz')
    expect(getMetaContent('og:video')).toBe('https://opencloud.test/foo.mp4')
    expect(getMetaContent('og:video:type')).toBe('video/mp4')

    eventBus.publish('runtime.router.path-chaged.after')
    eventBus.publish('runtime.documentTitle.changed', {
      shortDocumentTitle: 'Next page',
      fullDocumentTitle: 'Next page - OpenCloud'
    })

    expect(getMetaContent('og:title')).toBe('Next page')
    expect(getMetaContent('og:video')).toBeUndefined()
    expect(getMetaContent('og:video:type')).toBeUndefined()
  })
})
