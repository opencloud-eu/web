import ResolvePublicLink from '../../../src/pages/resolvePublicLink.vue'
import { defaultPlugins, defaultComponentMocks, shallowMount } from '@opencloud-eu/web-test-helpers'
import { mockDeep } from 'vitest-mock-extended'
import { CapabilityStore, ClientService, useRouteParam, useRouteQuery } from '@opencloud-eu/web-pkg'
import { DavHttpError, PublicSpaceResource, Resource, urlJoin } from '@opencloud-eu/web-client'
import { authService } from '../../../src/services/auth'
import { defineComponent, ref, unref, useTemplateRef } from 'vue'
import { DavErrorCode } from '@opencloud-eu/web-client/webdav'
import { flushPromises } from '@vue/test-utils'

vi.mock('../../../src/services/auth')

vi.mock('@opencloud-eu/web-pkg', async (importOriginal) => ({
  ...(await importOriginal<any>()),
  useRouteParam: vi.fn(),
  useRouteQuery: vi.fn()
}))

// the auto generated stub would drop the focus() the page calls on mount
const OcTextInputStub = defineComponent({
  name: 'OcTextInput',
  setup(_, { expose }) {
    const input = useTemplateRef<HTMLInputElement>('input')
    expose({ focus: () => unref(input).focus() })
    return {}
  },
  template: '<input ref="input" />'
})

const selectors = {
  ocSpinnerStub: 'oc-spinner-stub',
  submitButton: '.oc-login-authorize-button',
  errorMessage: '[data-testid="error-message"]'
}

describe('resolvePublicLink', () => {
  it('should display the loading spinner', () => {
    const { wrapper } = getWrapper({ passwordRequired: true })
    const loading = wrapper.find(selectors.ocSpinnerStub)
    expect(loading.exists()).toBeTruthy()
  })
  describe('password required form', () => {
    it('should display if password is required', async () => {
      const { wrapper } = getWrapper({ passwordRequired: true })
      await flushPromises()

      expect(wrapper.find('form').html()).toMatchSnapshot()
    })
    describe('submit button', () => {
      it('should be set as disabled if "password" is empty', async () => {
        const { wrapper } = getWrapper({ passwordRequired: true })
        await flushPromises()

        expect(wrapper.find(selectors.submitButton).attributes().disabled).toBe('true')
      })
      it('should be set as enabled if "password" is not empty', async () => {
        const { wrapper } = getWrapper({ passwordRequired: true })
        await flushPromises()
        ;(wrapper.vm as any).password = 'password'
        await wrapper.vm.$nextTick()

        expect(wrapper.find(selectors.submitButton).attributes().disabled).toBe('false')
      })
      it('should resolve the public link on click', async () => {
        const resolvePublicLinkSpy = vi.spyOn(authService, 'resolvePublicLink')
        const { wrapper } = getWrapper({ passwordRequired: true })
        await flushPromises()
        ;(wrapper.vm as any).password = 'password'
        await wrapper.vm.$nextTick()
        await wrapper.find(selectors.submitButton).trigger('submit')
        await flushPromises()

        expect(resolvePublicLinkSpy).toHaveBeenCalled()
      })
    })
  })
  describe('link target', () => {
    it('resolves to the file list for a link pointing to a folder', async () => {
      const { mocks } = getWrapper({ redirectUrl: '' })
      await flushPromises()

      expect(mocks.$router.push).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'files-public-link',
          params: expect.objectContaining({ driveAliasAndItem: 'public/token' })
        })
      )
    })
    it('resolves the file resource for a link pointing to a single file', async () => {
      const file = {
        id: 'file-id',
        fileId: 'file-id',
        parentFolderId: 'parent-id',
        isFolder: false,
        type: 'file',
        path: '/file.txt',
        canDownload: () => false,
        canBeDeleted: () => false,
        canRestore: () => false
      } as Resource
      // a link to a single file has no file id of its own
      const { mocks } = getWrapper({
        redirectUrl: '',
        spaceFileId: 'token',
        children: [file]
      })
      await flushPromises()

      expect(mocks.$clientService.webdav.listFiles).toHaveBeenCalled()
      expect(mocks.$router.push).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'files-public-link',
          query: expect.objectContaining({ scrollTo: 'file-id' })
        })
      )
    })
  })
  describe('error message', () => {
    it('should display an error message if the space cannot be resolved', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined)
      const { wrapper } = getWrapper({ getFileInfoErrorStatusCode: 404 })
      await flushPromises()

      expect(wrapper.find(selectors.errorMessage).text()).toContain(
        'The resource could not be located, it may not exist anymore.'
      )
    })
    it('should display an error message if the space cannot be resolved after entering password', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined)
      const { wrapper } = getWrapper({
        passwordRequired: true,
        getFileInfoErrorStatusCode: 404
      })
      await flushPromises()
      await expect((wrapper.vm as any).resolvePublicLinkTask.perform(true)).rejects.toThrow()

      expect(wrapper.find(selectors.errorMessage).text()).toContain(
        'The resource could not be located, it may not exist anymore.'
      )
    })
  })
})

function getWrapper({
  passwordRequired = false,
  getFileInfoErrorStatusCode = null,
  redirectUrl = 'redirectUrl',
  spaceFileId = 'folder-id',
  children = []
}: {
  passwordRequired?: boolean
  getFileInfoErrorStatusCode?: number
  redirectUrl?: string
  spaceFileId?: string
  children?: Resource[]
} = {}) {
  const $clientService = mockDeep<ClientService>()
  const spaceResource = mockDeep<PublicSpaceResource>({
    id: 'token',
    fileId: spaceFileId,
    driveType: 'public',
    driveAlias: 'public/token',
    isFolder: true,
    getDriveAliasAndItem: ({ path }: Resource) =>
      urlJoin('public/token', path, { leadingSlash: false })
  })

  // loadPublicSpaceTask response
  if (passwordRequired) {
    $clientService.webdav.getFileInfo.mockRejectedValueOnce(
      new DavHttpError('', 'ERR_MISSING_BASIC_AUTH', undefined, 401)
    )
  }

  if (getFileInfoErrorStatusCode) {
    $clientService.webdav.getFileInfo.mockRejectedValueOnce(
      new DavHttpError('', 'ERR_UNKNOWN' as DavErrorCode, undefined, getFileInfoErrorStatusCode)
    )
  } else {
    $clientService.webdav.getFileInfo.mockResolvedValueOnce(spaceResource)
  }

  $clientService.webdav.listFiles.mockResolvedValue({ resource: spaceResource, children })

  const mocks = { ...defaultComponentMocks(), $clientService }

  const capabilities = {
    files_sharing: { federation: { incoming: true, outgoing: true } }
  } satisfies Partial<CapabilityStore['capabilities']>

  vi.mocked(useRouteParam).mockReturnValue(ref('token'))
  vi.mocked(useRouteQuery).mockImplementation((name) =>
    ref(name === 'redirectUrl' ? redirectUrl : undefined)
  )

  return {
    mocks,
    wrapper: shallowMount(ResolvePublicLink, {
      global: {
        plugins: [...defaultPlugins({ piniaOptions: { capabilityState: { capabilities } } })],
        mocks,
        provide: mocks,
        stubs: {
          OcCard: false,
          PlainCard: false,
          OcTextInput: OcTextInputStub
        }
      }
    })
  }
}
