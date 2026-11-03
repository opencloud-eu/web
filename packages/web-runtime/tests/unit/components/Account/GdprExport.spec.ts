import GdprExport from '../../../../src/components/Account/GdprExport.vue'
import { defaultComponentMocks, defaultPlugins, shallowMount } from '@opencloud-eu/web-test-helpers'
import { mock, mockDeep } from 'vitest-mock-extended'
import { ClientService, useMessages } from '@opencloud-eu/web-pkg'
import { Resource } from '@opencloud-eu/web-client'
import { flushPromises } from '@vue/test-utils'

const selectors = {
  ocSpinnerStub: 'oc-spinner-stub',
  requestExportBtn: '[data-testid="request-export-btn"]',
  downloadExportBtn: '[data-testid="download-export-btn"]',
  exportInProgress: '[data-testid="export-in-process"]'
}

const downloadFile = vi.fn()
vi.mock('@opencloud-eu/web-pkg', async (importOriginal) => ({
  ...(await importOriginal<any>()),
  useDownloadFile: vi.fn(() => ({ downloadFile }))
}))

describe('GdprExport component', () => {
  it('shows the loading spinner initially', () => {
    const { wrapper } = getWrapper()
    expect(wrapper.find(selectors.ocSpinnerStub).exists()).toBeTruthy()
  })
  it('shows a "in progress"-hint', async () => {
    const { wrapper } = getWrapper(mock<Resource>({ processing: true }))
    await flushPromises()
    expect(wrapper.find(selectors.exportInProgress).exists()).toBeTruthy()
  })
  describe('request button', () => {
    it('shows if no export is being processed', async () => {
      const { wrapper } = getWrapper(mock<Resource>({ processing: false }))
      await flushPromises()
      expect(wrapper.find(selectors.requestExportBtn).exists()).toBeTruthy()
    })
    it('does not show when an export is being processed', async () => {
      const { wrapper } = getWrapper(mock<Resource>({ processing: true }))
      await flushPromises()
      expect(wrapper.find(selectors.requestExportBtn).exists()).toBeFalsy()
    })
    it('triggers the export when being clicked', async () => {
      const { wrapper, mocks } = getWrapper(mock<Resource>({ processing: false }))
      await flushPromises()
      await wrapper.find(selectors.requestExportBtn).trigger('click')
      expect(mocks.$clientService.graphAuthenticated.users.exportPersonalData).toHaveBeenCalled()
    })
    it('is disabled while the export is being requested', async () => {
      const { wrapper, mocks } = getWrapper(mock<Resource>({ processing: false }))
      await flushPromises()
      mocks.$clientService.graphAuthenticated.users.exportPersonalData.mockReturnValue(
        new Promise(() => {})
      )
      await wrapper.find(selectors.requestExportBtn).trigger('click')
      expect(wrapper.find(selectors.requestExportBtn).attributes('disabled')).toBe('true')
    })
    it('requests the export only once on a double click', async () => {
      const { wrapper, mocks } = getWrapper(mock<Resource>({ processing: false }))
      await flushPromises()
      const { exportPersonalData } = mocks.$clientService.graphAuthenticated.users
      exportPersonalData.mockReturnValue(new Promise(() => {}))
      await wrapper.find(selectors.requestExportBtn).trigger('click')
      await wrapper.find(selectors.requestExportBtn).trigger('click')
      expect(exportPersonalData).toHaveBeenCalledTimes(1)
    })
    it('shows only the success message on a double click', async () => {
      const { wrapper, mocks } = getWrapper(mock<Resource>({ processing: false }))
      await flushPromises()
      mocks.$clientService.webdav.getFileInfo.mockReturnValue(new Promise(() => {}))
      await wrapper.find(selectors.requestExportBtn).trigger('click')
      await flushPromises()
      await wrapper.find(selectors.requestExportBtn).trigger('click')
      await flushPromises()
      const { showMessage, showErrorMessage } = useMessages()
      expect(showErrorMessage).not.toHaveBeenCalled()
      expect(showMessage).toHaveBeenCalledTimes(1)
    })
    it('does not report an error when leaving the page while the export is being requested', async () => {
      const { wrapper, mocks } = getWrapper(mock<Resource>({ processing: false }))
      await flushPromises()
      const warnSpy = vi.spyOn(console, 'warn')
      mocks.$clientService.graphAuthenticated.users.exportPersonalData.mockReturnValue(
        new Promise(() => {})
      )
      await wrapper.find(selectors.requestExportBtn).trigger('click')
      wrapper.unmount()
      await flushPromises()
      expect(warnSpy).not.toHaveBeenCalled()
      expect(useMessages().showErrorMessage).not.toHaveBeenCalled()
    })
    it('shows an error message if the request fails', async () => {
      const { wrapper, mocks } = getWrapper(mock<Resource>({ processing: false }))
      await flushPromises()
      mocks.$clientService.graphAuthenticated.users.exportPersonalData.mockRejectedValue(
        new Error()
      )
      await wrapper.find(selectors.requestExportBtn).trigger('click')
      await flushPromises()
      const { showMessage, showErrorMessage } = useMessages()
      expect(showErrorMessage).toHaveBeenCalledTimes(1)
      expect(showMessage).not.toHaveBeenCalled()
    })
  })
  describe('download button', () => {
    it('shows if a gdpr export exists', async () => {
      const { wrapper } = getWrapper(mock<Resource>({ processing: false }))
      await flushPromises()
      expect(wrapper.find(selectors.downloadExportBtn).exists()).toBeTruthy()
    })
    it('does not show if no export exists', async () => {
      const { wrapper } = getWrapper()
      await flushPromises()
      expect(wrapper.find(selectors.downloadExportBtn).exists()).toBeFalsy()
    })
    it('triggers the download when being clicked', async () => {
      const { wrapper } = getWrapper(mock<Resource>({ processing: false }))
      await flushPromises()
      await wrapper.find(selectors.downloadExportBtn).trigger('click')
      expect(downloadFile).toHaveBeenCalled()
    })
  })
})

function getWrapper(resource: Resource = undefined) {
  const clientService = mockDeep<ClientService>()
  if (resource) {
    clientService.webdav.getFileInfo.mockResolvedValue(resource)
  } else {
    clientService.webdav.getFileInfo.mockRejectedValue({ statusCode: 404 })
  }
  const mocks = { ...defaultComponentMocks(), $clientService: clientService }

  return {
    mocks,
    wrapper: shallowMount(GdprExport, {
      global: {
        mocks,
        provide: mocks,
        plugins: [...defaultPlugins()]
      }
    })
  }
}
