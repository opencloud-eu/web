import resolvePrivateLink from '../../../src/pages/resolvePrivateLink.vue'
import { defaultPlugins, defaultComponentMocks, shallowMount } from '@opencloud-eu/web-test-helpers'
import { mock } from 'vitest-mock-extended'
import { queryItemAsString, useGetResourceContext } from '@opencloud-eu/web-pkg'
import { Resource, SHARE_JAIL_ID, SpaceResource } from '@opencloud-eu/web-client'
import { flushPromises } from '@vue/test-utils'

vi.mock('@opencloud-eu/web-pkg', async (importOriginal) => ({
  ...(await importOriginal<any>()),
  useRouteQuery: vi.fn((str) => str),
  useRouteParam: vi.fn((str) => str),
  queryItemAsString: vi.fn(),
  useGetResourceContext: vi.fn()
}))

const selectors = {
  ocSpinnerStub: 'oc-spinner-stub',
  errorMessage: '[data-testid="error-message"]'
}

describe('resolvePrivateLink', () => {
  it('is in a loading state initially', () => {
    const { wrapper } = getWrapper()
    expect(wrapper.find(selectors.ocSpinnerStub).exists()).toBeTruthy()
  })
  it('resolves to "files-spaces-generic" and passes the scrollTo query', async () => {
    const fileId = '1'
    const driveAliasAndItem = 'personal/home'
    const space = mock<SpaceResource>({ getDriveAliasAndItem: () => driveAliasAndItem })
    const resource = mock<Resource>({ fileId })
    const { mocks } = getWrapper({ space, resource, fileId, path: '/' })
    await flushPromises()
    expect(mocks.$router.push).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'files-spaces-generic',
        params: expect.objectContaining({ driveAliasAndItem }),
        query: expect.objectContaining({ scrollTo: fileId })
      })
    )
  })
  describe('resolves to "files-shares-with-me"', () => {
    it('resolves for single file shares', async () => {
      const fileId = '1'
      const driveAliasAndItem = 'shares/someShare'
      const space = mock<SpaceResource>({
        driveType: 'share',
        getDriveAliasAndItem: () => driveAliasAndItem
      })
      const resource = mock<Resource>({ fileId, type: 'file' })
      const { mocks } = getWrapper({ space, resource, fileId, path: '/' })
      await flushPromises()
      expect(mocks.$router.push).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'files-shares-with-me' })
      )
    })
    it.each([
      `${SHARE_JAIL_ID}$${SHARE_JAIL_ID}`,
      `${SHARE_JAIL_ID}$${SHARE_JAIL_ID}!${SHARE_JAIL_ID}`
    ])('resolves for the share jail id', async (fileId) => {
      const { mocks } = getWrapper({ fileId })
      await flushPromises()
      expect(mocks.$router.push).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'files-shares-with-me' })
      )
    })
    it('adds the hidden share param for hidden shares', async () => {
      const fileId = '1'
      const driveAliasAndItem = 'shares/someShare'
      const space = mock<SpaceResource>({
        driveType: 'share',
        getDriveAliasAndItem: () => driveAliasAndItem
      })
      const resource = mock<Resource>({ fileId, id: fileId, type: 'file' })
      const { mocks } = getWrapper({
        space,
        resource,
        fileId,
        path: '/',
        hiddenShare: true
      })
      await flushPromises()
      expect(mocks.$router.push).toHaveBeenCalledWith(
        expect.objectContaining({
          query: expect.objectContaining({ 'q_share-visibility': 'hidden' })
        })
      )
    })
  })
  it('passes the details query param if given via query', async () => {
    const details = 'sharing'
    const { mocks } = getWrapper({ details, path: '/' })
    await flushPromises()
    expect(mocks.$router.push).toHaveBeenCalledWith(
      expect.objectContaining({ query: expect.objectContaining({ details }) })
    )
  })
  it('throws an error if the path is empty', async () => {
    const { wrapper } = getWrapper()
    await flushPromises()

    expect(wrapper.find(selectors.errorMessage).text()).toEqual('The file or folder does not exist')
  })
  describe('openWithDefaultApp', () => {
    it('correctly passes the openWithDefaultApp param if enabled and given via query', async () => {
      const { mocks } = getWrapper({ path: '/' })
      await flushPromises()
      expect(mocks.$router.push).toHaveBeenCalledWith(
        expect.objectContaining({ query: expect.objectContaining({ openWithDefaultApp: 'true' }) })
      )
    })
    it('does not pass the openWithDefaultApp param when details param is given', async () => {
      const { mocks } = getWrapper({ details: 'sharing', path: '/' })
      await flushPromises()
      expect(mocks.$router.push).toHaveBeenCalledWith(
        expect.objectContaining({
          query: expect.not.objectContaining({ openWithDefaultApp: 'true' })
        })
      )
    })
    it('does not pass the openWithDefaultApp param when not requested via query', async () => {
      const { mocks } = getWrapper({ openWithDefaultAppQuery: 'false', path: '/' })
      await flushPromises()
      expect(mocks.$router.push).toHaveBeenCalledWith(
        expect.objectContaining({
          query: expect.not.objectContaining({ openWithDefaultApp: 'true' })
        })
      )
    })
  })
})

function getWrapper({
  space = mock<SpaceResource>(),
  resource = mock<Resource>(),
  path = '',
  fileId = '',
  details = '',
  hiddenShare = false,
  openWithDefaultAppQuery = 'true'
}: {
  space?: SpaceResource
  resource?: Resource
  path?: string
  fileId?: string
  details?: string
  hiddenShare?: boolean
  openWithDefaultAppQuery?: string
} = {}) {
  vi.mocked(queryItemAsString).mockImplementation((str) => {
    if (str === 'fileId') {
      return fileId
    }
    if (str === 'openWithDefaultApp') {
      return openWithDefaultAppQuery
    }
    if (str === 'details') {
      return details
    }
    return str.toString()
  })

  vi.mocked(useGetResourceContext).mockReturnValue({
    getResourceContext: vi.fn().mockResolvedValue({ space, resource, path })
  })

  const mocks = { ...defaultComponentMocks() }
  mocks.$clientService.graphAuthenticated.driveItems.listSharedWithMe.mockResolvedValue([
    { remoteItem: { id: '1' }, '@UI.Hidden': hiddenShare }
  ])

  return {
    mocks,
    wrapper: shallowMount(resolvePrivateLink, {
      global: {
        plugins: [...defaultPlugins()],
        mocks,
        provide: mocks,
        stubs: {
          OcCard: false
        }
      }
    })
  }
}
