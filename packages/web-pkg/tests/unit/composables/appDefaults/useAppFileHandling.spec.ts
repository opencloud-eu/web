import { mock } from 'vitest-mock-extended'
import { defaultComponentMocks, getComposableWrapper } from '@opencloud-eu/web-test-helpers'
import { Resource, SpaceResource } from '@opencloud-eu/web-client'
import { useAppFileHandling } from '../../../../src/composables/appDefaults/useAppFileHandling'

describe('useAppFileHandling', () => {
  describe('getUrlForResource', () => {
    it.each([
      { isGuestContext: false, signUrl: true },
      { isGuestContext: true, signUrl: false }
    ])(
      'passes signUrl $signUrl when isGuestContext is $isGuestContext',
      async ({ isGuestContext, signUrl }) => {
        const { wrapper, mocks } = createWrapper({ isGuestContext })
        const space = mock<SpaceResource>()
        const resource = mock<Resource>({ isInVault: false })

        await wrapper.vm.getUrlForResource(space, resource, { version: 'v1' })

        expect(mocks.$clientService.webdav.getFileUrl).toHaveBeenCalledWith(
          space,
          resource,
          expect.objectContaining({ version: 'v1', signUrl })
        )
      }
    )
  })
})

function createWrapper({ isGuestContext }: { isGuestContext: boolean }) {
  const mocks = defaultComponentMocks()
  const wrapper = getComposableWrapper(
    () => useAppFileHandling({ clientService: mocks.$clientService }),
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
