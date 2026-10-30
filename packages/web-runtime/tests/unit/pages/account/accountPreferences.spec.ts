import AccountPreferences from '../../../../src/pages/account/accountPreferences.vue'
import {
  defaultComponentMocks,
  defaultPlugins,
  mockAxiosReject,
  mockAxiosResolve,
  mount
} from '@opencloud-eu/web-test-helpers'
import { mock } from 'vitest-mock-extended'
import {
  Extension,
  ExtensionPoint,
  useExtensionRegistry,
  useMessages,
  useModals,
  useResourcesStore
} from '@opencloud-eu/web-pkg'
import { LanguageOption, SettingsBundle, SettingsValue } from '../../../../src/helpers/settings'
import { User } from '@opencloud-eu/web-client/graph/generated'
import { VueWrapper } from '@vue/test-utils'
import { SpaceResource } from '@opencloud-eu/web-client'
import { Capabilities } from '@opencloud-eu/web-client/ocs'
import { computed } from 'vue'
import { useNotificationsSettings } from '../../../../src/composables/notificationsSettings'

vi.mock('../../../../src/composables/notificationsSettings', async (importOriginal) => {
  const original =
    await importOriginal<typeof import('../../../../src/composables/notificationsSettings')>()
  return { ...original, useNotificationsSettings: vi.fn(original.useNotificationsSettings) }
})

const $route = {
  meta: {
    title: 'Some Title'
  }
}

const selectors = {
  editPasswordButton: '[data-testid="account-page-edit-password-btn"]'
}

describe('account preferences page', () => {
  describe('Preferences section', () => {
    describe('change password button', () => {
      it('should be displayed if not disabled via capability', async () => {
        const { wrapper } = getWrapper({
          capabilities: { graph: { users: { change_password_self_disabled: false } } }
        })
        await blockLoadingState(wrapper)

        const editPasswordButton = wrapper.find(selectors.editPasswordButton)
        expect(editPasswordButton.exists()).toBeTruthy()
      })
      it('should not be displayed if disabled via capability', async () => {
        const { wrapper } = getWrapper({
          capabilities: { graph: { users: { change_password_self_disabled: true } } }
        })
        await blockLoadingState(wrapper)

        const editPasswordButton = wrapper.find(selectors.editPasswordButton)
        expect(editPasswordButton.exists()).toBeFalsy()
      })
      it('opens the modal with the current password input focused', async () => {
        const { wrapper } = getWrapper({
          capabilities: { graph: { users: { change_password_self_disabled: false } } }
        })
        await blockLoadingState(wrapper)

        await wrapper.find(selectors.editPasswordButton).trigger('click')
        const { dispatchModal } = useModals()
        expect(dispatchModal).toHaveBeenCalledWith(
          expect.objectContaining({ focusTrapInitial: '#edit-password-current-input' })
        )
      })
    })
  })

  describe('Notifications section', () => {
    it('names the checkboxes and the interval select after the event of their row', async () => {
      vi.mocked(useNotificationsSettings).mockReturnValueOnce({
        options: computed(() => [
          mock<SettingsBundle['settings'][0]>({
            id: 'share-created',
            name: 'share-created',
            displayName: 'Share Received',
            multiChoiceCollectionValue: {
              options: [{ key: 'in-app', displayValue: 'In-App', value: { boolValue: {} } }]
            }
          })
        ]),
        values: computed(() => ({ 'share-created': { 'in-app': true } })),
        emailOptions: computed(() => [
          mock<SettingsBundle['settings'][0]>({
            id: 'interval',
            name: 'interval',
            displayName: 'Email sending interval',
            singleChoiceValue: { options: [{ value: 'daily', displayValue: 'Daily' }] }
          })
        ]),
        emailValues: computed(() => ({}))
      })
      const { wrapper } = getWrapper({
        capabilities: { notifications: { configurable: true } } as any
      })
      await blockLoadingState(wrapper)

      const checkbox = wrapper.find('.checkbox-cell-wrapper input')
      expect(checkbox.attributes('aria-label')).toBe('Share Received: In-App')
      const select = wrapper.findAll('.vs__dropdown-toggle').at(-1)
      expect(select.attributes('aria-label')).toContain('Email sending interval')
    })
  })

  describe('Method "updateDisableEmailNotifications', () => {
    it('should show a message on success', async () => {
      const { wrapper, mocks } = getWrapper()
      await blockLoadingState(wrapper)

      mocks.$clientService.httpAuthenticated.post.mockResolvedValueOnce(
        mockAxiosResolve({ value: { id: 'settings-language' } })
      )
      await (wrapper.vm as any).updateDisableEmailNotifications(true)
      const { showMessage } = useMessages()
      expect(showMessage).toHaveBeenCalled()
    })
    it('should show a message on error', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined)

      const { wrapper, mocks } = getWrapper()
      await blockLoadingState(wrapper)

      mocks.$clientService.httpAuthenticated.post.mockImplementation(() => mockAxiosReject('err'))
      await (wrapper.vm as any).updateDisableEmailNotifications(true)
      const { showErrorMessage } = useMessages()
      expect(showErrorMessage).toHaveBeenCalled()
    })
  })

  describe('Method "updateSelectedLanguage', () => {
    it('should show a message on success', async () => {
      const { wrapper, mocks } = getWrapper({})
      await blockLoadingState(wrapper)

      mocks.$clientService.graphAuthenticated.users.editMe.mockResolvedValueOnce(undefined)
      await (wrapper.vm as any).updateSelectedLanguage({ value: 'en' } as LanguageOption)
      const { showMessage } = useMessages()
      expect(showMessage).toHaveBeenCalled()
    })
    it('should show a message on error', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined)

      const { wrapper, mocks } = getWrapper({})
      await blockLoadingState(wrapper)

      mocks.$clientService.graphAuthenticated.users.editMe.mockRejectedValue(new Error())
      await (wrapper.vm as any).updateSelectedLanguage({ value: 'en' } as LanguageOption)
      const { showErrorMessage } = useMessages()
      expect(showErrorMessage).toHaveBeenCalled()
    })

    it('should refetch settings bundles', async () => {
      const { wrapper, mocks } = getWrapper({})
      await blockLoadingState(wrapper)

      mocks.$clientService.graphAuthenticated.users.editMe.mockResolvedValueOnce(undefined)
      await (wrapper.vm as any).updateSelectedLanguage({ value: 'en' } as LanguageOption)
      expect(mocks.$clientService.httpAuthenticated.post).toHaveBeenCalledWith(
        '/api/v0/settings/bundles-list',
        {},
        { signal: expect.any(AbortSignal) }
      )
    })
  })

  describe('Method "updateViewOptionsWebDavDetails', () => {
    it('should show a message on success', async () => {
      const { wrapper } = getWrapper({})
      await blockLoadingState(wrapper)

      await (wrapper.vm as any).updateViewOptionsWebDavDetails(true)
      const { showMessage } = useMessages()
      expect(showMessage).toHaveBeenCalled()

      const { setAreWebDavDetailsShown } = useResourcesStore()
      expect(setAreWebDavDetailsShown).toHaveBeenCalled()
    })
  })

  describe('Method "updateMultiChoiceSettingsValue"', () => {
    it('should show a message on success', async () => {
      const { wrapper, mocks } = getWrapper({})
      await blockLoadingState(wrapper)

      mocks.$clientService.httpAuthenticated.post.mockResolvedValueOnce(
        mockAxiosResolve({
          value: { identifier: { setting: 'setting-id' }, value: { id: 'value-id' } }
        })
      )
      await (wrapper.vm as any).updateMultiChoiceSettingsValue('setting-id', 'setting-key', true)
      const { showMessage } = useMessages()
      expect(showMessage).toHaveBeenCalled()
    })

    it('should show a message on error', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined)

      const { wrapper, mocks } = getWrapper({})
      await blockLoadingState(wrapper)

      mocks.$clientService.httpAuthenticated.post.mockImplementation(() => mockAxiosReject('err'))
      await (wrapper.vm as any).updateMultiChoiceSettingsValue('setting-id', 'setting-key', true)
      const { showErrorMessage } = useMessages()
      expect(showErrorMessage).toHaveBeenCalled()
    })
  })

  describe('Method "updateSingleChoiceValue"', () => {
    it('should show a message on success', async () => {
      const { wrapper, mocks } = getWrapper({})
      await blockLoadingState(wrapper)

      mocks.$clientService.httpAuthenticated.post.mockResolvedValueOnce(
        mockAxiosResolve({
          value: { identifier: { setting: 'setting-id' }, value: { id: 'value-id' } }
        })
      )
      await (wrapper.vm as any).updateSingleChoiceValue('setting-id', {
        displayValue: 'Daily',
        value: { stringValue: 'daily' }
      })
      const { showMessage } = useMessages()
      expect(showMessage).toHaveBeenCalled()
    })

    it('should show a message on error', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined)

      const { wrapper, mocks } = getWrapper({})
      await blockLoadingState(wrapper)

      mocks.$clientService.httpAuthenticated.post.mockImplementation(() => mockAxiosReject('err'))
      await (wrapper.vm as any).updateSingleChoiceValue('setting-id', {
        displayValue: 'Daily',
        value: { stringValue: 'daily' }
      })
      const { showErrorMessage } = useMessages()
      expect(showErrorMessage).toHaveBeenCalled()
    })
  })
})

const blockLoadingState = async (wrapper: VueWrapper<any, any>) => {
  await wrapper.vm.loadAccountBundleTask.last
  await wrapper.vm.loadValuesListTask.last
  await wrapper.vm.loadGraphUserTask.last
}

function getWrapper({
  user = mock<User>({ memberOf: [] }),
  capabilities = {},
  spaces = [],
  isUserContext = true,
  extensionPoints = [],
  extensions = []
}: {
  user?: User
  capabilities?: Partial<Capabilities['capabilities']>
  spaces?: SpaceResource[]
  isUserContext?: boolean
  extensionPoints?: ExtensionPoint<Extension>[]
  extensions?: Extension[]
} = {}) {
  const plugins = defaultPlugins({
    piniaOptions: {
      userState: { user },
      authState: {
        userContextReady: isUserContext
      },
      spacesState: { spaces },
      capabilityState: { capabilities }
    }
  })

  const { getExtensionPoints, requestExtensions } = useExtensionRegistry()
  vi.mocked(getExtensionPoints).mockReturnValue(extensionPoints)
  vi.mocked(requestExtensions).mockReturnValue(extensions)

  const mocks = {
    ...defaultComponentMocks(),
    $route
  }

  mocks.$clientService.httpAuthenticated.post.mockImplementation((url) => {
    let response = {}

    if (url.endsWith('bundles-list')) {
      response = { bundles: [mock<SettingsBundle>()] }
    }
    if (url.endsWith('values-list')) {
      response = { values: [mock<SettingsValue>()] }
    }

    return Promise.resolve(mockAxiosResolve(response))
  })
  mocks.$clientService.graphAuthenticated.users.getMe.mockResolvedValue(mock<User>({ id: '1' }))

  return {
    mocks,
    wrapper: mount(AccountPreferences, {
      global: {
        plugins,
        mocks,
        provide: mocks
      }
    })
  }
}
