import { defineComponent, unref, useTemplateRef } from 'vue'
import { mockDeep } from 'vitest-mock-extended'
import { flushPromises } from '@vue/test-utils'
import { ClientService, GuestSession } from '@opencloud-eu/web-pkg'
import { Resource, ShareSpaceResource } from '@opencloud-eu/web-client'
import { defaultComponentMocks, defaultPlugins, shallowMount } from '@opencloud-eu/web-test-helpers'
import GuestSessionExpired from '../../../src/pages/guestSessionExpired.vue'
import { authService } from '../../../src/services/auth'

vi.mock('../../../src/services/auth')

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
  form: 'form',
  submitButton: '.oc-login-authorize-button'
}

const guestSession: GuestSession = {
  shareId: 'share-id',
  shareName: 'Invited folder',
  permissions: [],
  expiresAt: Date.now() + 1000
}

describe('guestSessionExpired', () => {
  it('offers the pin form when the share id is known', () => {
    const { wrapper } = getWrapper()
    expect(wrapper.find(selectors.form).exists()).toBeTruthy()
  })

  it('only tells the guest to check their inbox when the share id is unknown', () => {
    const { wrapper } = getWrapper({ guestShareId: null })
    expect(wrapper.find(selectors.form).exists()).toBeFalsy()
    expect(wrapper.text()).toContain('Open the invitation link in your email inbox')
  })

  it('disables the submit button until a pin is entered', async () => {
    const { wrapper } = getWrapper()
    expect(wrapper.find(selectors.submitButton).attributes('disabled')).toEqual('true')

    ;(wrapper.vm as any).pin = '123456'
    await wrapper.vm.$nextTick()

    expect(wrapper.find(selectors.submitButton).attributes('disabled')).toEqual('false')
  })

  it('restores the session and navigates on a correct pin', async () => {
    const { wrapper, mocks } = getWrapper()
    ;(wrapper.vm as any).pin = '123456'

    await (wrapper.vm as any).verifyPinTask.perform()
    await flushPromises()

    expect(authService.verifyGuestPin).toHaveBeenCalledWith('123456')
    expect(mocks.$router.replace).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'files-spaces-generic',
        query: expect.objectContaining({ shareId: 'share-id' })
      })
    )
  })

  it('reports an incorrect pin', async () => {
    const { wrapper } = getWrapper({ verifyError: new Error('unauthorized') })
    ;(wrapper.vm as any).pin = 'wrong'

    await expect((wrapper.vm as any).verifyPinTask.perform()).rejects.toThrow()
    await wrapper.vm.$nextTick()

    expect(wrapper.findComponent(OcTextInputStub).attributes('error-message')).toEqual(
      'Incorrect PIN'
    )
  })
})

function getWrapper({
  guestShareId = 'share-id',
  verifyError = null
}: { guestShareId?: string; verifyError?: Error } = {}) {
  const $clientService = mockDeep<ClientService>()
  const space = mockDeep<ShareSpaceResource>({
    id: 'share-id',
    driveType: 'share',
    driveAlias: 'share/Invited folder',
    getDriveAliasAndItem: () => 'share/Invited folder'
  })

  $clientService.webdav.getFileInfo.mockResolvedValue(
    mockDeep<Resource>({ id: 'resource-id', isFolder: true, path: '/' })
  )

  if (verifyError) {
    vi.mocked(authService.verifyGuestPin).mockRejectedValue(verifyError)
  } else {
    vi.mocked(authService.verifyGuestPin).mockResolvedValue(guestSession)
  }

  const mocks = { ...defaultComponentMocks(), $clientService }

  return {
    mocks,
    wrapper: shallowMount(GuestSessionExpired, {
      global: {
        plugins: [
          ...defaultPlugins({
            piniaOptions: {
              stubActions: false,
              authState: { guestShareId },
              spacesState: { spaces: [space] }
            }
          })
        ],
        mocks,
        provide: mocks,
        stubs: { OcCard: false, PlainCard: false, OcTextInput: OcTextInputStub }
      }
    })
  }
}
