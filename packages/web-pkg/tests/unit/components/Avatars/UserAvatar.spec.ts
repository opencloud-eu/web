import UserAvatar from '../../../../src/components/Avatars/UserAvatar.vue'
import {
  defaultComponentMocks,
  defaultPlugins,
  mount,
  nextTicks
} from '@opencloud-eu/web-test-helpers'
import { ClientService } from '../../../../src'
import { mock, mockDeep } from 'vitest-mock-extended'

const blobUrl = 'blob:http://localhost:9200/12345678-1234-1234-1234-123456789012'

describe('UserAvatar', () => {
  window.URL.createObjectURL = vi.fn(() => blobUrl)

  it('should show an image when set', async () => {
    const clientService = mockDeep<ClientService>()
    clientService.graphAuthenticated.photos.getUserPhoto.mockResolvedValueOnce(mock<File>())
    const { wrapper } = getWrapper({ clientService })

    await nextTicks(2)

    expect(wrapper.find('img').attributes().src).toEqual(blobUrl)
    expect(wrapper.find('.avatar-initials').exists()).toBe(false)
  })

  it('should load the avatar of a newly set user', async () => {
    const clientService = mockDeep<ClientService>()
    clientService.graphAuthenticated.photos.getUserPhoto.mockResolvedValue(mock<File>())
    const { wrapper } = getWrapper({ clientService })

    await nextTicks(2)
    expect(clientService.graphAuthenticated.photos.getUserPhoto).toHaveBeenCalledWith(
      '1',
      expect.anything()
    )

    await wrapper.setProps({ userId: '2' })
    await nextTicks(2)

    expect(clientService.graphAuthenticated.photos.getUserPhoto).toHaveBeenCalledWith(
      '2',
      expect.anything()
    )
  })

  it('should show initials when image not set', async () => {
    const clientService = mockDeep<ClientService>()
    clientService.graphAuthenticated.photos.getUserPhoto.mockRejectedValueOnce(new Error(''))
    const { wrapper } = getWrapper({ clientService })

    await nextTicks(2)

    expect(wrapper.find('.avatar-initials').exists()).toBe(true)
    expect(wrapper.find('img').exists()).toBe(false)
  })
})

const getWrapper = ({ clientService }: { clientService?: ClientService } = {}) => {
  const mocks = {
    ...defaultComponentMocks(),
    $clientService: clientService
  }

  return {
    mocks,
    wrapper: mount(UserAvatar, {
      props: {
        userId: '1',
        userName: 'bär houdini'
      },
      global: {
        plugins: [...defaultPlugins({ piniaOptions: { stubActions: false } })],
        mocks,
        provide: mocks
      }
    })
  }
}
