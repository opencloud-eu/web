import ResolvePublicLink from '../../../src/pages/resolvePublicLink.vue'
import { defaultPlugins, defaultComponentMocks, shallowMount } from '@opencloud-eu/web-test-helpers'
import { mockDeep } from 'vitest-mock-extended'
import { CapabilityStore, ClientService, useRouteParam, useRouteQuery } from '@opencloud-eu/web-pkg'
import { DavHttpError, SpaceResource } from '@opencloud-eu/web-client'
import { authService } from '../../../src/services/auth'
import { ref } from 'vue'
import { DavErrorCode } from '@opencloud-eu/web-client/webdav'

vi.mock('../../../src/services/auth')

vi.mock('@opencloud-eu/web-pkg', async (importOriginal) => ({
  ...(await importOriginal<any>()),
  useRouteParam: vi.fn(),
  useRouteQuery: vi.fn()
}))

const selectors = {
  cardFooter: '.oc-card-footer',
  ocSpinnerStub: 'oc-spinner-stub',
  submitButton: '.oc-login-authorize-button',
  errorMessage: '[data-testid="error-message"]'
}

describe('resolvePublicLink', () => {
  it('should display the configuration theme general slogan as the login card footer', () => {
    const { wrapper } = getWrapper()
    const slogan = wrapper.find(selectors.cardFooter)
    expect(slogan.html()).toMatchSnapshot()
  })
  it('should display the loading spinner', () => {
    const { wrapper } = getWrapper({ passwordRequired: true })
    const loading = wrapper.find(selectors.ocSpinnerStub)
    expect(loading.exists()).toBeTruthy()
  })
  describe('password required form', () => {
    it('should display if password is required', async () => {
      const { wrapper } = getWrapper({ passwordRequired: true })
      await wrapper.vm.loadPublicSpaceTask.last

      expect(wrapper.find('form').html()).toMatchSnapshot()
    })
    describe('submit button', () => {
      it('should be set as disabled if "password" is empty', async () => {
        const { wrapper } = getWrapper({ passwordRequired: true })
        await wrapper.vm.loadPublicSpaceTask.last

        expect(wrapper.find(selectors.submitButton).attributes().disabled).toBe('true')
      })
      it('should be set as enabled if "password" is not empty', async () => {
        const { wrapper } = getWrapper({ passwordRequired: true })
        await wrapper.vm.loadPublicSpaceTask.last
        wrapper.vm.password = 'password'
        await wrapper.vm.$nextTick()

        expect(wrapper.find(selectors.submitButton).attributes().disabled).toBe('false')
      })
      it('should resolve the public link on click', async () => {
        const resolvePublicLinkSpy = vi.spyOn(authService, 'resolvePublicLink')
        const { wrapper } = getWrapper({ passwordRequired: true })
        await wrapper.vm.loadPublicSpaceTask.last

        wrapper.vm.password = 'password'
        await wrapper.vm.$nextTick()
        await wrapper.find(selectors.submitButton).trigger('submit')
        await wrapper.vm.resolvePublicLinkTask.last

        expect(resolvePublicLinkSpy).toHaveBeenCalled()
      })
    })
  })
  describe('error message', () => {
    it('should display an error message if the space cannot be resolved', async () => {
      console.error = vi.fn()
      const { wrapper } = getWrapper({ getFileInfoErrorStatusCode: 404 })

      try {
        await wrapper.vm.loadPublicSpaceTask.last
      } catch {}

      expect(wrapper.find(selectors.errorMessage).text()).toContain(
        'The resource could not be located, it may not exist anymore.'
      )
    })
    it('should display an error message if the space cannot be resolved after entering password', async () => {
      console.error = vi.fn()
      const { wrapper } = getWrapper({
        passwordRequired: true,
        getFileInfoErrorStatusCode: 404
      })
      await wrapper.vm.loadPublicSpaceTask.last
      await expect(wrapper.vm.resolvePublicLinkTask.perform(true)).rejects.toThrow()

      expect(wrapper.find(selectors.errorMessage).text()).toContain(
        'The resource could not be located, it may not exist anymore.'
      )
    })
  })
})

function getWrapper({
  passwordRequired = false,
  getFileInfoErrorStatusCode = null
}: {
  passwordRequired?: boolean
  getFileInfoErrorStatusCode?: number
} = {}) {
  const $clientService = mockDeep<ClientService>()
  const spaceResource = mockDeep<SpaceResource>({ driveType: 'public' })

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

  const mocks = { ...defaultComponentMocks(), $clientService }

  const capabilities = {
    files_sharing: { federation: { incoming: true, outgoing: true } }
  } satisfies Partial<CapabilityStore['capabilities']>

  vi.mocked(useRouteParam).mockReturnValue(ref('token'))
  vi.mocked(useRouteQuery).mockReturnValue(ref('redirectUrl'))

  return {
    mocks,
    wrapper: shallowMount(ResolvePublicLink, {
      global: {
        plugins: [...defaultPlugins({ piniaOptions: { capabilityState: { capabilities } } })],
        mocks,
        provide: mocks,
        stubs: {
          OcCard: false
        }
      }
    })
  }
}
