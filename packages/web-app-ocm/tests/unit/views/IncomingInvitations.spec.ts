import { mockDeep } from 'vitest-mock-extended'
import {
  defaultComponentMocks,
  defaultPlugins,
  mockAxiosResolve,
  shallowMount
} from '@opencloud-eu/web-test-helpers'
import { ClientService } from '@opencloud-eu/web-pkg'
import { OcTextInput } from '@opencloud-eu/design-system/components'
import { flushPromises } from '@vue/test-utils'
import IncomingInvitations from '../../../src/views/IncomingInvitations.vue'

describe('IncomingInvitations view', () => {
  it('accepts the invitation on form submit', async () => {
    const { wrapper, mocks } = getWrapper()
    await enterToken(wrapper, 'token@example.org')

    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(mocks.$clientService.httpAuthenticated.post).toHaveBeenCalledWith(
      '/sciencemesh/accept-invite',
      { token: 'token', providerDomain: 'example.org' }
    )
  })

  it('does not accept on form submit without a valid token', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const { wrapper, mocks } = getWrapper()
    await enterToken(wrapper, 'invalid')

    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(mocks.$clientService.httpAuthenticated.post).not.toHaveBeenCalled()
  })
})

async function enterToken(wrapper: ReturnType<typeof getWrapper>['wrapper'], value: string) {
  wrapper.findComponent(OcTextInput).vm.$emit('update:modelValue', value)
  await wrapper.vm.$nextTick()
}

function getWrapper() {
  const clientService = mockDeep<ClientService>()
  clientService.httpAuthenticated.post.mockResolvedValue(mockAxiosResolve({}))
  const mocks = { ...defaultComponentMocks(), $clientService: clientService }

  return {
    mocks,
    wrapper: shallowMount(IncomingInvitations, {
      global: {
        mocks,
        provide: mocks,
        plugins: [...defaultPlugins()]
      }
    })
  }
}
