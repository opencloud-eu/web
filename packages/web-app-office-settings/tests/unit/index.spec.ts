import { unref } from 'vue'
import { RouteRecordRaw } from 'vue-router'
import { ClassicApplicationScript, SidebarNavExtension } from '@opencloud-eu/web-pkg'
import { DefaultPluginsOptions, getComposableWrapper } from '@opencloud-eu/web-test-helpers'
import officeSettingsApp from '../../src/index'

vi.mock('virtual:l10n/web-app-office-settings', () => ({ default: {} }))

type AbilityRule = DefaultPluginsOptions['abilities'][number]

const manageFontsAbilities: AbilityRule[] = [
  { action: 'create-all', subject: 'Font' },
  { action: 'delete-all', subject: 'Font' }
]

describe('office settings app', () => {
  describe('nav item', () => {
    it('is visible with the permission to manage fonts', () => {
      const { navItem } = getAppScript(manageFontsAbilities)
      expect(navItem.isVisible()).toBe(true)
    })
    it('is hidden without the permission to manage fonts', () => {
      const { navItem } = getAppScript([])
      expect(navItem.isVisible()).toBe(false)
    })
  })
  describe('route', () => {
    it('opens with the permission to manage fonts', () => {
      const { route } = getAppScript(manageFontsAbilities)
      expect((route.beforeEnter as () => unknown)()).toBeUndefined()
    })
    it('redirects without the permission to manage fonts', () => {
      const { route } = getAppScript([])
      expect((route.beforeEnter as () => unknown)()).toEqual({ path: '/' })
    })
  })
})

function getAppScript(abilities: AbilityRule[]) {
  let script: ClassicApplicationScript
  getComposableWrapper(
    () => {
      script = officeSettingsApp.setup({ applicationConfig: {} })
    },
    { pluginOptions: { abilities } }
  )
  const navItem = (unref(script.extensions)[0] as SidebarNavExtension).navItem
  const route = (script.routes as RouteRecordRaw[]).find(({ name }) => name === 'office')
  return { navItem, route }
}
