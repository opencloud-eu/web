import { mock } from 'vitest-mock-extended'
import { getComposableWrapper } from '@opencloud-eu/web-test-helpers'
import { Capabilities } from '@opencloud-eu/web-client/ocs'
import { useUpload } from '../../../../src/composables/upload'
import { OcTusOptions, OcUppyFile, UppyService } from '../../../../src/services/uppy/uppyService'
import { ClientService } from '../../../../src/services'

describe('useUpload', () => {
  it.each([true, false])('passes withCredentials %s to the xhr uploader', (guestContextReady) => {
    const { uppyService } = getWrapper({ guestContextReady, tusMaxChunkSize: 0 })

    expect(uppyService.useXhr).toHaveBeenCalledWith(
      expect.objectContaining({ withCredentials: guestContextReady })
    )
  })

  it.each([true, false])('sets withCredentials %s on tus requests', async (guestContextReady) => {
    const { uppyService } = getWrapper({ guestContextReady, tusMaxChunkSize: 1000 })
    const { onBeforeRequest } = vi.mocked(uppyService.useTus).mock.calls[0][0] as OcTusOptions
    const xhr = { withCredentials: false }
    const req = { setHeader: vi.fn(), getUnderlyingObject: () => xhr }

    await onBeforeRequest(req as never, mock<OcUppyFile>({ isRemote: false }))

    expect(xhr.withCredentials).toBe(guestContextReady)
  })
})

function getWrapper({
  guestContextReady,
  tusMaxChunkSize
}: {
  guestContextReady: boolean
  tusMaxChunkSize: number
}) {
  const uppyService = mock<UppyService>()
  const mocks = { $clientService: mock<ClientService>() }
  getComposableWrapper(() => useUpload({ uppyService }), {
    mocks,
    provide: mocks,
    pluginOptions: {
      piniaOptions: {
        authState: { guestContextReady },
        capabilityState: {
          capabilities: {
            files: { tus_support: { max_chunk_size: tusMaxChunkSize, extension: '' } }
          } as Partial<Capabilities['capabilities']>
        }
      }
    }
  })
  return { uppyService }
}
