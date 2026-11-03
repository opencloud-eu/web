import { ArchiverService } from '../../../src/services'
import { RuntimeError } from '../../../src/errors'
import { mock, mockDeep } from 'vitest-mock-extended'
import { ClientService } from '../../../src/services'
import { unref, ref, Ref } from 'vue'
import { ArchiverCapability } from '@opencloud-eu/web-client/ocs'
import { createTestingPinia } from '@opencloud-eu/web-test-helpers'
import { useAuthStore, useUserStore } from '../../../src/composables/piniaStores'
import { triggerDownloadWithFilename } from '../../../src/helpers/download'

vi.mock('../../../src/helpers/download')

const serverUrl = 'https://demo.opencloud.eu'
const getArchiverServiceInstance = (
  capabilities: Ref<ArchiverCapability[]>,
  { isGuest = false }: { isGuest?: boolean } = {}
) => {
  createTestingPinia({ initialState: { auth: { guestContextReady: isGuest } } })
  const userStore = useUserStore()
  const authStore = useAuthStore()

  const clientServiceMock = mockDeep<ClientService>()
  clientServiceMock.ocs.signUrl.mockImplementation((url) =>
    Promise.resolve(url + '&OC-Signature=sig')
  )

  return {
    archiverService: new ArchiverService(
      clientServiceMock,
      userStore,
      authStore,
      serverUrl,
      capabilities
    ),
    clientServiceMock
  }
}

describe('archiver', () => {
  describe('availability', () => {
    it('is unavailable if no version given via capabilities', () => {
      const capabilities = ref([mock<ArchiverCapability>({ version: undefined })])
      expect(unref(getArchiverServiceInstance(capabilities).archiverService.available)).toBe(false)
    })
    it('is available if a version is given via capabilities', () => {
      const capabilities = ref([mock<ArchiverCapability>({ version: '1' })])
      expect(unref(getArchiverServiceInstance(capabilities).archiverService.available)).toBe(true)
    })
  })
  it('does not trigger downloads when unavailable', async () => {
    const capabilities = ref([mock<ArchiverCapability>({ version: undefined })])
    const { archiverService } = getArchiverServiceInstance(capabilities)
    await expect(archiverService.triggerDownload({})).rejects.toThrow(
      new RuntimeError('no archiver available')
    )
  })
  describe('with one archiver capability', () => {
    const archiverUrl = [serverUrl, 'archiver'].join('/')
    const capabilities = ref([
      {
        enabled: true,
        version: 'v2.3.5',
        archiver_url: archiverUrl,
        formats: [],
        max_num_files: '42',
        max_size: '1073741824'
      }
    ])

    it('fails to trigger a download if no files were given', async () => {
      const { archiverService } = getArchiverServiceInstance(capabilities)
      await expect(archiverService.triggerDownload({})).rejects.toThrow(
        new RuntimeError('requested archive with empty list of resources')
      )
    })
    it('returns a download url for a valid archive download trigger', async () => {
      const { archiverService } = getArchiverServiceInstance(capabilities)
      const fileId = 'asdf'
      const url = await archiverService.triggerDownload({ fileIds: [fileId] })
      expect(url.startsWith(archiverUrl)).toBeTruthy()
      expect(url.indexOf(`id=${fileId}`)).toBeGreaterThan(-1)
    })
    it('signs the download url for regular users', async () => {
      const { archiverService, clientServiceMock } = getArchiverServiceInstance(capabilities)
      const url = await archiverService.triggerDownload({ fileIds: ['asdf'] })
      expect(clientServiceMock.ocs.signUrl).toHaveBeenCalled()
      expect(url).toContain('OC-Signature=sig')
    })
    it('does not sign the download url for public links', async () => {
      const { archiverService, clientServiceMock } = getArchiverServiceInstance(capabilities)
      const url = await archiverService.triggerDownload({ fileIds: ['asdf'], publicToken: 'token' })
      expect(clientServiceMock.ocs.signUrl).not.toHaveBeenCalled()
      expect(url).toBe(`${archiverUrl}?public-token=token&id=asdf`)
    })
    it('authenticates password protected public links via a server-generated signature', async () => {
      const { archiverService, clientServiceMock } = getArchiverServiceInstance(capabilities)
      clientServiceMock.webdav.getPublicLinkSignature.mockResolvedValue({
        signature: 'sig',
        expiration: '2026-11-02T12:00:00+01:00'
      })
      const url = await archiverService.triggerDownload({
        fileIds: ['asdf'],
        publicToken: 'token',
        publicLinkPassword: 'password'
      })
      expect(clientServiceMock.webdav.getPublicLinkSignature).toHaveBeenCalledWith('token')
      expect(clientServiceMock.ocs.signUrl).not.toHaveBeenCalled()
      expect(url).toBe(
        `${archiverUrl}?public-token=token&signature=sig&expiration=2026-11-02T12%3A00%3A00%2B01%3A00&id=asdf`
      )
    })
    it('falls back to the unsigned url if no signature is available for a public link with password', async () => {
      const { archiverService, clientServiceMock } = getArchiverServiceInstance(capabilities)
      clientServiceMock.webdav.getPublicLinkSignature.mockResolvedValue(undefined)
      const url = await archiverService.triggerDownload({
        fileIds: ['asdf'],
        publicToken: 'token',
        publicLinkPassword: 'password'
      })
      expect(clientServiceMock.webdav.getPublicLinkSignature).toHaveBeenCalledWith('token')
      expect(url).toBe(`${archiverUrl}?public-token=token&id=asdf`)
    })
    it('fails without triggering a download if the signature request fails', async () => {
      const { archiverService, clientServiceMock } = getArchiverServiceInstance(capabilities)
      const error = new Error('unauthorized')
      clientServiceMock.webdav.getPublicLinkSignature.mockRejectedValue(error)
      await expect(
        archiverService.triggerDownload({
          fileIds: ['asdf'],
          publicToken: 'token',
          publicLinkPassword: 'password'
        })
      ).rejects.toThrow(error)
      expect(triggerDownloadWithFilename).not.toHaveBeenCalled()
    })
    it('does not fetch a signature for public links without password', async () => {
      const { archiverService, clientServiceMock } = getArchiverServiceInstance(capabilities)
      await archiverService.triggerDownload({ fileIds: ['asdf'], publicToken: 'token' })
      expect(clientServiceMock.webdav.getPublicLinkSignature).not.toHaveBeenCalled()
    })
    it('does not sign the download url for guests', async () => {
      const { archiverService, clientServiceMock } = getArchiverServiceInstance(capabilities, {
        isGuest: true
      })
      const url = await archiverService.triggerDownload({ fileIds: ['asdf'] })
      expect(clientServiceMock.ocs.signUrl).not.toHaveBeenCalled()
      expect(url).toBe(`${archiverUrl}?id=asdf`)
    })
  })
  describe('with multiple archiver capabilities of different versions', () => {
    const archiverUrl = [serverUrl, 'archiver'].join('/')
    const capabilityV1 = {
      enabled: true,
      version: 'v1.2.3',
      archiver_url: archiverUrl + '/v1',
      formats: [],
      max_num_files: '42',
      max_size: '1073741824'
    } as ArchiverCapability
    const capabilityV2 = {
      enabled: true,
      version: 'v2.3.5',
      archiver_url: archiverUrl + '/v2',
      formats: [],
      max_num_files: '42',
      max_size: '1073741824'
    } as ArchiverCapability
    const capabilityV3 = {
      enabled: false,
      version: 'v3.2.5',
      archiver_url: archiverUrl + '/v3',
      formats: [],
      max_num_files: '42',
      max_size: '1073741824'
    } as ArchiverCapability

    it('uses the highest major version', async () => {
      const capabilities = ref([capabilityV1, capabilityV2, capabilityV3])
      const { archiverService } = getArchiverServiceInstance(capabilities)
      const downloadUrl = await archiverService.triggerDownload({ fileIds: ['any'] })
      expect(downloadUrl.startsWith(capabilityV2.archiver_url)).toBeTruthy()
    })
  })
})
