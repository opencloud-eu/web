import { unref } from 'vue'
import { defaultComponentMocks, getComposableWrapper } from '@opencloud-eu/web-test-helpers'
import { useAddressBooksStore } from '../../../src/composables/piniaStores/addressbooks'

type LoadAddressBooksModule = typeof import('../../../src/composables/useLoadAddressbooks')

describe('useLoadAddressBooks', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    // the loading task is a module singleton bound to the client service of its first caller
    vi.resetModules()
  })

  it('sets the error state and clears the address books if loading fails', async () => {
    const { mocks, instance } = await getWrapper()
    const error = new Error('failed')
    mocks.$clientService.httpAuthenticated.get.mockRejectedValue(error)

    await expect(instance.loadAddressBooks('account')).rejects.toThrow()

    expect(unref(instance.error)).toBe(error)
    expect(useAddressBooksStore().setAddressBooks).toHaveBeenCalledWith([])
  })
})

async function getWrapper() {
  const { useLoadAddressBooks }: LoadAddressBooksModule =
    await import('../../../src/composables/useLoadAddressbooks')
  const mocks = defaultComponentMocks()
  let instance: ReturnType<typeof useLoadAddressBooks>
  getComposableWrapper(
    () => {
      instance = useLoadAddressBooks()
    },
    { mocks, provide: mocks }
  )
  return { mocks, instance }
}
