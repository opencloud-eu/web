import App from '../../src/App.vue'
import { useLayout } from '../../src/composables/layout'
import {
  defaultComponentMocks,
  defaultPlugins,
  RouteLocation,
  shallowMount
} from '@opencloud-eu/web-test-helpers'
import { eventBus, WebThemeType } from '@opencloud-eu/web-pkg'
import { mock } from 'vitest-mock-extended'
import { computed, nextTick } from 'vue'
import { routeLocationKey } from 'vue-router'
import { createGettext } from 'vue3-gettext'

vi.mock('../../src/composables/layout')

describe('App', () => {
  beforeEach(() => {
    document.title = ''
  })

  it('updates the route based document title on a language change without an announcement', async () => {
    const { wrapper, language } = getWrapper()
    eventBus.publish('runtime.router.path-chaged.after')
    await nextTick()
    expect(document.title).toBe('Einstellungen - OpenCloud')
    expect(wrapper.find('oc-hidden-announcer-stub').attributes('announcement')).toBe(
      'Navigated to Einstellungen'
    )

    language.current = 'en'
    await nextTick()
    expect(document.title).toBe('Preferences - OpenCloud')
    expect(wrapper.find('oc-hidden-announcer-stub').attributes('announcement')).toBe(
      'Navigated to Einstellungen'
    )

    wrapper.unmount()
  })

  it('does not overwrite a document title set by a view on a language change', async () => {
    const { wrapper, language } = getWrapper()
    eventBus.publish('runtime.router.path-chaged.after')
    eventBus.publish('runtime.documentTitle.changed', {
      shortDocumentTitle: 'file.txt - Preview',
      fullDocumentTitle: 'file.txt - Preview - OpenCloud'
    })
    await nextTick()

    language.current = 'en'
    await nextTick()
    expect(document.title).toBe('file.txt - Preview - OpenCloud')

    wrapper.unmount()
  })
})

function getWrapper() {
  vi.mocked(useLayout).mockReturnValue({
    layout: computed(() => ({ template: '<div />' })),
    layoutType: computed(() => 'application' as const)
  } as ReturnType<typeof useLayout>)

  const language = createGettext({
    translations: { de: { Preferences: 'Einstellungen' } },
    defaultLanguage: 'de',
    silent: true
  })
  const currentRoute = mock<RouteLocation>({
    name: 'account-preferences',
    path: '/account/preferences',
    meta: { title: 'Preferences' }
  })
  const mocks = defaultComponentMocks({ currentRoute })

  return {
    language,
    wrapper: shallowMount(App, {
      global: {
        plugins: [
          ...defaultPlugins({
            gettext: false,
            piniaOptions: {
              themeState: { currentTheme: mock<WebThemeType>({ name: 'OpenCloud' }) }
            }
          }),
          language
        ],
        mocks,
        provide: { ...mocks, [routeLocationKey]: currentRoute }
      }
    })
  }
}
