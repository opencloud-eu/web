import QuotaModal from '../../../../src/components/Spaces/QuotaModal.vue'
import QuotaSelect from '../../../../src/components/QuotaSelect.vue'
import { defaultComponentMocks, defaultPlugins, mount } from '@opencloud-eu/web-test-helpers'
import {
  useMessages,
  useResourcesStore,
  useSpacesStore
} from '../../../../src/composables/piniaStores'
import { eventBus } from '../../../../src/services'
import { SpaceResource } from '@opencloud-eu/web-client'
import { mock } from 'vitest-mock-extended'
import { RouteLocationNormalizedLoaded } from 'vue-router'

describe('QuotaModal', () => {
  it('starts with the existing quota and disables confirmation until it changes', async () => {
    const { wrapper } = getWrapper()
    expect(wrapper.find('.vs__selected').text()).toBe('10 GB')
    expect(wrapper.emitted('update:confirmDisabled')).toEqual([[true]])

    await selectQuota(wrapper, '2 GB')
    expect(wrapper.emitted('update:confirmDisabled').at(-1)).toEqual([false])

    await selectQuota(wrapper, '10 GB')
    expect(wrapper.emitted('update:confirmDisabled').at(-1)).toEqual([true])
  })

  it('does not offer Default when editing an existing quota', async () => {
    const { wrapper } = getWrapper()
    await openSelect(wrapper)
    expect(wrapper.findAll('.vs__dropdown-option').map((option) => option.text())).not.toContain(
      'Default'
    )
  })

  it('ignores a default selection because the backend cannot reset a quota', async () => {
    const { wrapper, mocks } = getWrapper()
    wrapper.findComponent(QuotaSelect).vm.$emit('selectedOptionChange', { value: null })
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted('update:confirmDisabled').at(-1)).toEqual([true])

    await wrapper.vm.onConfirm()

    expect(mocks.$clientService.graphAuthenticated.drives.updateDrive).toHaveBeenCalledWith(
      'space-1',
      { quota: { total: 10e9 } }
    )
  })

  it.each([
    ['2 GB', 2e9],
    ['No restriction', 0]
  ] as const)(
    'saves %s and updates both stores using the server response',
    async (label, total) => {
      const { wrapper, mocks } = getWrapper()
      const spaceQuota = { total, used: 164, remaining: total - 164, state: 'normal' }
      mocks.$clientService.graphAuthenticated.drives.updateDrive.mockResolvedValue(
        mock<SpaceResource>({ id: 'space-1', spaceQuota })
      )
      await selectQuota(wrapper, label)

      await wrapper.vm.onConfirm()

      expect(mocks.$clientService.graphAuthenticated.drives.updateDrive).toHaveBeenCalledWith(
        'space-1',
        { quota: { total } }
      )
      const update = { id: 'space-1', field: 'spaceQuota', value: spaceQuota }
      expect(useSpacesStore().updateSpaceField).toHaveBeenCalledWith(update)
      expect(useResourcesStore().updateResourceField).toHaveBeenCalledWith(update)
      expect(useMessages().showMessage).toHaveBeenCalledWith({
        title: 'Space quota was changed successfully'
      })
    }
  )

  it('allows a mixed selection to be unified to the first quota', async () => {
    const spaces = [makeSpace('space-1', 10e9), makeSpace('space-2', 2e9)]
    const { wrapper, mocks } = getWrapper({ spaces })
    expect(wrapper.emitted('update:confirmDisabled')).toEqual([[false]])

    await wrapper.vm.onConfirm()

    expect(mocks.$clientService.graphAuthenticated.drives.updateDrive).toHaveBeenCalledTimes(2)
    spaces.forEach(({ id }) => {
      expect(mocks.$clientService.graphAuthenticated.drives.updateDrive).toHaveBeenCalledWith(id, {
        quota: { total: 10e9 }
      })
    })
    expect(useMessages().showMessage).toHaveBeenCalledWith({
      title: 'Quota of 2 spaces was changed successfully'
    })
  })

  it('disables confirmation for multiple spaces that already have the selected quota', () => {
    const { wrapper } = getWrapper({
      spaces: [makeSpace('space-1', 10e9), makeSpace('space-2', 10e9)]
    })
    expect(wrapper.emitted('update:confirmDisabled')).toEqual([[true]])
  })

  it.each([
    ['space', 'Space quota was changed successfully', 'Failed to change space quota'],
    ['user', 'User quota was changed successfully', 'Failed to change user quota'],
    ['other', 'Quota was changed successfully', 'Failed to change quota']
  ])('reports partial success for resource type %s', async (resourceType, success, failure) => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const error = new Error('forbidden')
    const { wrapper, mocks } = getWrapper({
      spaces: [makeSpace('space-1', 10e9), makeSpace('space-2', 10e9)],
      resourceType
    })
    mocks.$clientService.graphAuthenticated.drives.updateDrive.mockRejectedValueOnce(error)
    await selectQuota(wrapper, '2 GB')

    await wrapper.vm.onConfirm()

    expect(useSpacesStore().updateSpaceField).toHaveBeenCalledTimes(1)
    expect(useSpacesStore().updateSpaceField).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'space-2' })
    )
    expect(useResourcesStore().updateResourceField).toHaveBeenCalledTimes(1)
    expect(useMessages().showMessage).toHaveBeenCalledWith({ title: success })
    expect(useMessages().showErrorMessage).toHaveBeenCalledWith({ title: failure, errors: [error] })
  })

  it.each([
    ['space', 'Failed to change quota for 2 spaces'],
    ['user', 'Failed to change quota for 2 users']
  ])(
    'reports all failures for resource type %s without updating stores',
    async (resourceType, title) => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined)
      const error = new Error('forbidden')
      const { wrapper, mocks } = getWrapper({
        spaces: [makeSpace('space-1', 10e9), makeSpace('space-2', 10e9)],
        resourceType
      })
      mocks.$clientService.graphAuthenticated.drives.updateDrive.mockRejectedValue(error)
      await wrapper.vm.onConfirm()

      expect(useSpacesStore().updateSpaceField).not.toHaveBeenCalled()
      expect(useResourcesStore().updateResourceField).not.toHaveBeenCalled()
      expect(useMessages().showMessage).not.toHaveBeenCalled()
      expect(useMessages().showErrorMessage).toHaveBeenCalledWith({ title, errors: [error, error] })
    }
  )

  it('publishes updated personal quotas in user administration', async () => {
    const publish = vi.spyOn(eventBus, 'publish')
    const { wrapper } = getWrapper({ resourceType: 'user', routeName: 'admin-settings-users' })
    await selectQuota(wrapper, '2 GB')
    await wrapper.vm.onConfirm()

    expect(publish).toHaveBeenCalledWith('app.admin-settings.users.user.quota.updated', {
      spaceId: 'space-1',
      quota: expect.objectContaining({ total: 2e9, used: 164, remaining: 2e9 - 164 })
    })
  })

  it('keeps confirmation disabled for users without a drive and shows the warning', async () => {
    const { wrapper, mocks } = getWrapper({
      spaces: [],
      warningMessage: 'Quota will only be applied to users who logged in at least once.'
    })
    expect(wrapper.emitted('update:confirmDisabled')).toEqual([[true]])
    expect(wrapper.find('.oc-text-input-warning').text()).toBe(
      'Quota will only be applied to users who logged in at least once.'
    )
    await wrapper.vm.onConfirm()
    expect(mocks.$clientService.graphAuthenticated.drives.updateDrive).not.toHaveBeenCalled()
    expect(useMessages().showMessage).not.toHaveBeenCalled()
  })
})

type Wrapper = ReturnType<typeof getWrapper>['wrapper']

async function openSelect(wrapper: Wrapper) {
  const search = wrapper.find('input.vs__search')
  await search.trigger('click')
  await search.trigger('focus')
}

async function selectQuota(wrapper: Wrapper, label: string) {
  await openSelect(wrapper)
  await wrapper
    .findAll('.vs__dropdown-option')
    .find((option) => option.text() === label)
    .trigger('click')
}

function makeSpace(id: string, total: number) {
  return mock<SpaceResource>({
    id,
    name: 'Team',
    spaceQuota: { remaining: total - 164, state: 'normal', total, used: 164 }
  })
}

function getWrapper({
  spaces = [makeSpace('space-1', 10e9)],
  resourceType = 'space',
  warningMessage = '',
  routeName = ''
} = {}) {
  const mocks = defaultComponentMocks({
    currentRoute: mock<RouteLocationNormalizedLoaded>({ name: routeName })
  })
  mocks.$clientService.graphAuthenticated.drives.updateDrive.mockImplementation((id, { quota }) =>
    Promise.resolve(makeSpace(id, quota.total))
  )
  return {
    mocks,
    wrapper: mount(QuotaModal, {
      props: { modal: undefined, spaces, resourceType, warningMessage },
      global: {
        mocks,
        provide: mocks,
        plugins: [...defaultPlugins()]
      }
    })
  }
}
