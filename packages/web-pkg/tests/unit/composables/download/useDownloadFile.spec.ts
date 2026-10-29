import { mock } from 'vitest-mock-extended'
import { defaultComponentMocks, getComposableWrapper } from '@opencloud-eu/web-test-helpers'
import { Resource, SpaceResource } from '@opencloud-eu/web-client'
import { useDownloadFile } from '../../../../src/composables/download'

vi.mock('../../../../src/helpers', async (importOriginal) => ({
  ...(await importOriginal<any>()),
  triggerDownloadWithFilename: vi.fn()
}))

describe('useDownloadFile', () => {
  it.each([
    { isGuestContext: false, signUrl: true },
    { isGuestContext: true, signUrl: false }
  ])(
    'passes signUrl $signUrl when isGuestContext is $isGuestContext',
    async ({ isGuestContext, signUrl }) => {
      const { wrapper, mocks } = createWrapper({ isGuestContext })
      const space = mock<SpaceResource>()
      const file = mock<Resource>({ isInVault: false })

      await wrapper.vm.downloadFile(space, file, 'v1')

      expect(mocks.$clientService.webdav.getFileUrl).toHaveBeenCalledWith(
        space,
        file,
        expect.objectContaining({ version: 'v1', signUrl })
      )
    }
  )
})

function createWrapper({ isGuestContext }: { isGuestContext: boolean }) {
  const mocks = defaultComponentMocks()
  const wrapper = getComposableWrapper(
    () => useDownloadFile({ clientService: mocks.$clientService }),
    {
      mocks,
      provide: mocks,
      pluginOptions: {
        piniaOptions: { authState: { guestContextReady: isGuestContext } }
      }
    }
  )
  return { wrapper, mocks }
}
