import Groups from '../../../src/views/Groups.vue'
import { mock, mockDeep } from 'vitest-mock-extended'
import { ClientService, SideBarPanel, useMessages } from '@opencloud-eu/web-pkg'
import { defaultComponentMocks, defaultPlugins, mount } from '@opencloud-eu/web-test-helpers'
import { Group } from '@opencloud-eu/web-client/graph/generated'
import { flushPromises } from '@vue/test-utils'
import AppTemplate from '../../../src/components/AppTemplate.vue'

const selectors = { batchActionsStub: 'batch-actions-stub' }
const getClientServiceMock = () => {
  const clientService = mockDeep<ClientService>()
  clientService.graphAuthenticated.groups.listGroups.mockResolvedValue([
    mock<Group>({ id: '1', displayName: 'users', groupTypes: [] })
  ])
  return clientService
}
vi.mock('@opencloud-eu/web-pkg', async (importOriginal) => ({
  ...(await importOriginal<any>()),
  useAppDefaults: vi.fn()
}))

describe('Groups view', () => {
  describe('loading groups', () => {
    it('shows an error message when loading fails', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined)
      const clientService = getClientServiceMock()
      clientService.graphAuthenticated.groups.listGroups.mockRejectedValueOnce(new Error('failed'))
      const { wrapper } = getWrapper({ clientService })
      await flushPromises()
      expect(useMessages().showErrorMessage).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Failed to load groups' })
      )
      expect(wrapper.find('no-content-message-stub').exists()).toBeTruthy()
    })
  })

  describe('side bar panels', () => {
    describe('EditPanel', () => {
      it('should be available when one group is selected', () => {
        const { wrapper } = getWrapper()
        expect(
          getSideBarPanels(wrapper)
            .find(({ name }) => name === 'EditPanel')
            .isVisible({ items: [{ id: '1' }] })
        ).toBeTruthy()
      })
      it('should not be available when multiple groups are selected', () => {
        const { wrapper } = getWrapper()
        expect(
          getSideBarPanels(wrapper)
            .find(({ name }) => name === 'EditPanel')
            .isVisible({ items: [{ id: '1' }, { id: '2' }] })
        ).toBeFalsy()
      })
      it('should not be available when one read-only group is selected', () => {
        const { wrapper } = getWrapper()
        expect(
          getSideBarPanels(wrapper)
            .find(({ name }) => name === 'EditPanel')
            .isVisible({ items: [{ id: '1', groupTypes: ['ReadOnly'] }] })
        ).toBeFalsy()
      })
    })
    describe('DetailsPanel', () => {
      it('should contain DetailsPanel when no group is selected', () => {
        const { wrapper } = getWrapper()
        expect(
          getSideBarPanels(wrapper)
            .find(({ name }) => name === 'DetailsPanel')
            .isVisible({ items: [] })
        ).toBeTruthy()
      })
    })
  })

  describe('batch actions', () => {
    it('do not display when no group selected', async () => {
      const { wrapper } = getWrapper()
      await flushPromises()
      expect(wrapper.find(selectors.batchActionsStub).exists()).toBeFalsy()
    })
    it('display when one group selected', async () => {
      const { wrapper } = getWrapper({ selectedGroups: [{ id: '1' }] })
      await flushPromises()
      expect(wrapper.find(selectors.batchActionsStub).exists()).toBeTruthy()
    })
    it('display when more than one groups selected', async () => {
      const { wrapper } = getWrapper({ selectedGroups: [{ id: '1' }, { id: '2' }] })
      await flushPromises()
      expect(wrapper.find(selectors.batchActionsStub).exists()).toBeTruthy()
    })
  })

  it('stops loading the groups without an error when leaving the page', async () => {
    const clientService = getClientServiceMock()
    clientService.graphAuthenticated.groups.listGroups.mockReturnValue(new Promise(() => {}))
    const errorHandler = vi.fn()
    const { wrapper } = getWrapper({ clientService, errorHandler })

    wrapper.unmount()
    await flushPromises()

    expect(errorHandler).not.toHaveBeenCalled()
  })
})

function getSideBarPanels(wrapper: ReturnType<typeof getWrapper>['wrapper']) {
  return wrapper.findComponent(AppTemplate).props('sideBarAvailablePanels') as SideBarPanel<
    unknown,
    unknown,
    Group
  >[]
}

function getWrapper({
  clientService = getClientServiceMock(),
  groups = [],
  selectedGroups = [],
  errorHandler = undefined
}: {
  clientService?: ClientService
  groups?: Group[]
  selectedGroups?: Group[]
  errorHandler?: (err: unknown) => void
} = {}) {
  const mocks = { ...defaultComponentMocks(), $clientService: clientService }

  return {
    wrapper: mount(Groups, {
      global: {
        plugins: [
          ...defaultPlugins({
            piniaOptions: {
              groupSettingsStore: { groups, selectedGroups }
            }
          })
        ],
        mocks,
        provide: mocks,
        stubs: {
          AppLoadingSpinner: true,
          NoContentMessage: true,
          GroupsList: true,
          OcBreadcrumb: true,
          BatchActions: true
        },
        config: { errorHandler }
      }
    })
  }
}
