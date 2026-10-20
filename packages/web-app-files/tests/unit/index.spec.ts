import { createPinia, setActivePinia } from 'pinia'
import { navItems } from '../../src/index'
import {
  AppNavigationItem,
  GlobalProperties,
  NavItem,
  SidebarNavExtension,
  useExtensionRegistry,
  useNavItems,
  useSpacesStore
} from '@opencloud-eu/web-pkg'
import { Ability, SpaceResource } from '@opencloud-eu/web-client'
import { Capabilities } from '@opencloud-eu/web-client/ocs'
import { mock } from 'vitest-mock-extended'
import { computed, ComputedRef, defineComponent, unref } from 'vue'
import { createRouter, defaultPlugins, mount } from '@opencloud-eu/web-test-helpers'
import { RouteRecordRaw } from 'vue-router'

const callableNavItems = navItems as (args: GlobalProperties) => AppNavigationItem[]

const personalSpace = mock<SpaceResource>({
  id: '1',
  driveType: 'personal',
  driveAlias: 'personal/admin',
  isOwner: () => true
})

const routes: RouteRecordRaw[] = [
  'files/favorites',
  'files/shares',
  'files/spaces/projects',
  'files/spaces/:driveAliasAndItem(.*)?',
  'files/trash/overview',
  'files/guest/shares',
  'files/guest/:driveAliasAndItem(.*)?'
].map((path) => ({
  path: `/${path}`,
  name: path,
  component: defineComponent({ template: '<div />' })
}))

describe('Web app files', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    const spacesStore = useSpacesStore()
    spacesStore.spacesInitialized = true
  })

  describe('navItems', () => {
    describe('Personal', () => {
      it('should be enabled if user has a personal space', () => {
        const spacesStore = useSpacesStore()
        spacesStore.spaces = [
          mock<SpaceResource>({ id: '1', driveType: 'personal', isOwner: () => true })
        ]
        const items = callableNavItems(mock<GlobalProperties>())
        expect(items[0].isVisible()).toBeTruthy()
      })
      it('should be disabled if user has no a personal space', () => {
        const spacesStore = useSpacesStore()
        spacesStore.spaces = [
          mock<SpaceResource>({ id: '1', driveType: 'project', isOwner: () => false })
        ]
        const items = callableNavItems(mock<GlobalProperties>())
        expect(items[0].isVisible()).toBeFalsy()
      })
    })

    describe('active state', () => {
      it('marks "Spaces" as active on the project spaces overview', async () => {
        const { getActiveNames } = await getNavItemsWrapper({ path: '/files/spaces/projects' })
        expect(getActiveNames()).toEqual(['Spaces'])
      })
      it.each(['/files/shares', '/files/spaces/share/some-share'])(
        'marks "Shares" as active on the shares route %s',
        async (path) => {
          const { getActiveNames } = await getNavItemsWrapper({ path })
          expect(getActiveNames()).toEqual(['Shares'])
        }
      )
      it.each(['/files/guest/shares', '/files/guest/share/some-share'])(
        'only shows "Shares" as active to guests on the guest route %s',
        async (path) => {
          const { getNames, getActiveNames } = await getNavItemsWrapper({ path, isGuest: true })
          expect(getNames()).toEqual(['Shares'])
          expect(getActiveNames()).toEqual(['Shares'])
        }
      )
      it('does not show guest items to users', async () => {
        const { getNames } = await getNavItemsWrapper({ path: '/files/shares' })
        expect(getNames()).toEqual(['Personal', 'Favorites', 'Shares', 'Spaces'])
      })
      it('marks only "Personal" as active when navigating from the project spaces overview to the personal space', async () => {
        const { router, getActiveNames } = await getNavItemsWrapper({
          path: '/files/spaces/projects'
        })

        // no space has been resolved yet, which is the case right after a page reload
        await router.push('/files/spaces/personal')

        expect(getActiveNames()).toEqual(['Personal'])
      })
    })
  })
})

async function getNavItemsWrapper({ path, isGuest = false }: { path: string; isGuest?: boolean }) {
  const plugins = defaultPlugins({
    piniaOptions: {
      stubActions: false,
      authState: isGuest ? { guestContextReady: true } : { userContextReady: true },
      capabilityState: {
        capabilities: { spaces: mock<Capabilities['capabilities']['spaces']>({ projects: true }) }
      }
    }
  })

  const spacesStore = useSpacesStore()
  spacesStore.spacesInitialized = true
  spacesStore.spaces = [personalSpace]

  const items = callableNavItems(
    mock<GlobalProperties>({
      $ability: mock<Ability>({ can: () => true }),
      $gettext: (msg: string) => msg
    })
  )
  useExtensionRegistry().registerExtensions(
    computed<SidebarNavExtension[]>(() =>
      items.map((navItem, index) => ({
        id: `app.files.navItem-${index}`,
        type: 'sidebarNav',
        navItem,
        extensionPointIds: ['app.files.navItems']
      }))
    )
  )

  const router = createRouter({ routes })
  await router.push(path)
  await router.isReady()

  let resolvedNavItems: ComputedRef<NavItem[]>
  const wrapper = mount(
    defineComponent({
      setup() {
        resolvedNavItems = useNavItems().navItems
      },
      template: '<div />'
    }),
    {
      global: {
        plugins: [...plugins, router],
        provide: { $router: router },
        mocks: { $router: router }
      }
    }
  )

  return {
    wrapper,
    router,
    getNames: () => unref(resolvedNavItems).map(({ name }) => name),
    getActiveNames: () =>
      unref(resolvedNavItems)
        .filter(({ active }) => active)
        .map(({ name }) => name)
  }
}
