import qs from 'qs'
import { createMemoryHistory, createRouter } from 'vue-router'
import { useAuthStore } from '@opencloud-eu/web-pkg'
import { createTestingPinia } from '@opencloud-eu/web-test-helpers'
import { setupContextRouteGuard } from '../../../src/router/setupContextRouteGuard'
import { patchRouter } from '../../../src/router/patchCleanPath'

describe('setupContextRouteGuard', () => {
  beforeEach(() => {
    createTestingPinia({ stubActions: false })
  })

  it.each([
    {
      case: 'a file in a public link folder',
      path: '/app/public/token/folder/note.md',
      contextRouteName: 'files-public-link',
      driveAliasAndItem: 'public/token/folder'
    },
    {
      case: 'a file at the public link root',
      path: '/app/public/token/note.md',
      contextRouteName: 'files-public-link',
      driveAliasAndItem: 'public/token'
    },
    {
      case: 'a file in an ocm link',
      path: '/app/ocm/token/note.md',
      contextRouteName: 'files-public-link',
      driveAliasAndItem: 'ocm/token'
    },
    {
      case: 'a file in a space',
      path: '/app/personal/admin/folder/note.md',
      contextRouteName: 'files-spaces-generic',
      driveAliasAndItem: 'personal/admin/folder'
    },
    {
      case: 'a file at a space root',
      path: '/app/project/marketing/note.md',
      contextRouteName: 'files-spaces-generic',
      driveAliasAndItem: 'project/marketing'
    }
  ])('adds the folder of $case as context route', async ({ path, ...expected }) => {
    const router = getRouter()

    await router.push(path)

    expect(getContextQuery(router)).toMatchObject({
      contextRouteName: expected.contextRouteName,
      contextRouteParams: { driveAliasAndItem: expected.driveAliasAndItem }
    })
  })

  it('keeps the app route and its query', async () => {
    const router = getRouter()

    await router.push('/app/personal/admin/note.md?fileId=file-id')

    expect(router.currentRoute.value.name).toEqual('app')
    expect(router.currentRoute.value.params.driveAliasAndItem).toEqual('personal/admin/note.md')
    expect(router.currentRoute.value.query.fileId).toEqual('file-id')
  })

  it('keeps the clean path of the app route', async () => {
    const router = getRouter()

    await router.push('/app/personal/admin/folder/a%23b.md')

    expect(router.currentRoute.value.path).toEqual('/app/personal/admin/folder/a%23b.md')
    expect(router.currentRoute.value.params.driveAliasAndItem).toEqual(
      'personal/admin/folder/a#b.md'
    )
  })

  it('passes the share id on to the context route of a file in a share', async () => {
    const router = getRouter()

    await router.push('/app/share/Shared folder/note.md?shareId=share-id')

    expect(getContextQuery(router)).toMatchObject({
      contextRouteName: 'files-spaces-generic',
      contextRouteParams: { driveAliasAndItem: 'share/Shared folder' },
      contextRouteQuery: { shareId: 'share-id' }
    })
  })

  it('adds the guest link as context route in a guest context', async () => {
    const router = getRouter()
    useAuthStore().setGuestContext('permission-id', 'space-id')

    await router.push('/app/share/Shared folder/note.md?shareId=share-id')

    expect(getContextQuery(router)).toMatchObject({
      contextRouteName: 'files-guest-link',
      contextRouteParams: { driveAliasAndItem: 'share/Shared folder' }
    })
  })

  it.each([
    { case: 'a user', isGuest: false, contextRouteName: 'files-shares-with-me' },
    { case: 'a guest', isGuest: true, contextRouteName: 'files-guest-shares' }
  ])(
    'adds the shares list as context route of a single file share for $case',
    async ({ isGuest, contextRouteName }) => {
      const router = getRouter()
      if (isGuest) {
        useAuthStore().setGuestContext('permission-id', 'space-id')
      }

      await router.push('/app/share/note.md?shareId=share-id')

      expect(getContextQuery(router).contextRouteName).toEqual(contextRouteName)
    }
  )

  it('keeps an existing context route', async () => {
    const router = getRouter()

    await router.push({
      name: 'app',
      params: { driveAliasAndItem: 'personal/admin/folder/note.md' },
      query: {
        contextRouteName: 'files-common-search',
        contextRouteParams: {},
        contextRouteQuery: {}
      } as any
    })

    expect(getContextQuery(router).contextRouteName).toEqual('files-common-search')
  })

  it.each([
    { case: 'non-hybrid routes', path: '/user/personal/admin/note.md' },
    { case: 'hybrid routes without a drive alias', path: '/account' }
  ])('ignores $case', async ({ path }) => {
    const router = getRouter()

    await router.push(path)

    expect(router.currentRoute.value.query.contextRouteName).toBeUndefined()
  })
})

function getContextQuery(router: ReturnType<typeof getRouter>) {
  return router.currentRoute.value.query as Record<string, any>
}

function getRouter() {
  const component = { template: '<div />' }
  const router = patchRouter(
    createRouter({
      parseQuery: (query) => qs.parse(query, { allowDots: true }) as any,
      stringifyQuery: (obj) => qs.stringify(obj, { allowDots: true }),
      history: createMemoryHistory(),
      routes: [
        {
          path: '/app/:driveAliasAndItem(.*)?',
          name: 'app',
          component,
          meta: { authContext: 'hybrid', patchCleanPath: true }
        },
        {
          path: '/user/:driveAliasAndItem(.*)?',
          name: 'user',
          component,
          meta: { authContext: 'user' }
        },
        { path: '/account', name: 'account', component, meta: { authContext: 'hybrid' } }
      ]
    })
  )
  setupContextRouteGuard(router)
  return router
}
