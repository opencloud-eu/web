import { mock } from 'vitest-mock-extended'
import { defineComponent, h } from 'vue'
import CreateFolderModal from '../../../../src/components/Modals/CreateFolderModal.vue'
import { defaultComponentMocks, defaultPlugins, mount } from '@opencloud-eu/web-test-helpers'
import { Modal } from '@opencloud-eu/web-pkg'
import { Resource } from '@opencloud-eu/web-client'

const finalize = vi.fn()

/**
 * Stands in for the vault scheme's setup step. Reports itself invalid on mount
 * and turns valid when its button is clicked, so tests can drive the same
 * `update:valid` contract a real scheme uses.
 */
const SetupStub = defineComponent({
  name: 'SetupStub',
  props: { vaultName: { type: String, required: true } },
  emits: ['update:valid'],
  setup(props, { emit, expose }) {
    emit('update:valid', false)
    expose({ finalize })
    return () =>
      h('div', { 'data-testid': 'setup-stub' }, [
        props.vaultName,
        h('button', { 'data-testid': 'setup-valid', onClick: () => emit('update:valid', true) })
      ])
  }
})

describe('CreateFolderModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('offers encryption when a vault scheme can create vaults', () => {
    const { wrapper } = getWrapper()

    expect(wrapper.find('[data-testid="create-folder-encrypt"]').exists()).toBeTruthy()
  })

  it('hides encryption when no vault scheme is available', () => {
    const { wrapper } = getWrapper({ canEncrypt: false })

    expect(wrapper.find('[data-testid="create-folder-encrypt"]').exists()).toBeFalsy()
  })

  it('flips the lock icon closed once encryption is toggled on', async () => {
    const { wrapper } = getWrapper()
    const lockIcon = () =>
      wrapper.find('[data-testid="create-folder-encrypt"]').findComponent({ name: 'OcIcon' })

    expect(lockIcon().props('name')).toBe('lock-unlock')

    await toggleEncrypt(wrapper)

    expect(lockIcon().props('name')).toBe('lock-2')
    expect(wrapper.find('[role="switch"]').attributes('aria-checked')).toBe('true')
  })

  it('leaves the primary button as the only submit button, so enter creates', () => {
    const { wrapper } = getWrapper()
    const submitButtons = wrapper
      .findAll('button')
      .filter((b) => (b.element as HTMLButtonElement).type === 'submit')

    expect(submitButtons.length).toBe(1)
    expect(submitButtons[0].classes()).toContain('oc-modal-body-actions-confirm')
  })

  it('disables the primary button while the name is invalid', async () => {
    const { wrapper } = getWrapper()
    await setName(wrapper, '')

    expect(isPrimaryDisabled(wrapper)).toBe(true)

    await setName(wrapper, 'valid name')

    expect(isPrimaryDisabled(wrapper)).toBe(false)
  })

  it('disables the primary button while the creation is in flight', () => {
    // Submitting twice would create the folder twice and commit two different
    // vault secrets to it.
    const { wrapper } = getWrapper({ isLoading: true })

    expect(isPrimaryDisabled(wrapper)).toBe(true)
  })

  it('re-validates against the vault name when encryption is toggled', async () => {
    // the plain name is free, but the name the vault scheme would use is taken
    const { wrapper } = getWrapper({
      resources: [mock<Resource>({ name: 'myfolder.vault', path: '/myfolder.vault' })]
    })
    await setName(wrapper, 'myfolder')

    expect(isPrimaryDisabled(wrapper)).toBe(false)

    await toggleEncrypt(wrapper)

    expect(isPrimaryDisabled(wrapper)).toBe(true)
  })

  describe('two-step flow', () => {
    it('creates in one step when encryption is off, with no back button', async () => {
      const { wrapper } = getWrapper()

      expect(primary(wrapper).text()).toBe('Create')
      expect(secondary(wrapper).exists()).toBe(false)
    })

    it('asks to continue to the setup step when encryption is on', async () => {
      const { wrapper } = getWrapper()
      await toggleEncrypt(wrapper)

      expect(primary(wrapper).text()).toBe('Continue')
      expect(wrapper.find('[data-testid="setup-stub"]').exists()).toBeFalsy()
    })

    it('hands the vault name to the setup step and blocks Create until it is valid', async () => {
      const { wrapper } = getWrapper()
      await setName(wrapper, 'myfolder')
      await toggleEncrypt(wrapper)
      await submitStep(wrapper)

      const setup = wrapper.find('[data-testid="setup-stub"]')
      expect(setup.exists()).toBeTruthy()
      expect(setup.text()).toContain('myfolder.vault')
      expect(primary(wrapper).text()).toBe('Create')
      expect(secondary(wrapper).text()).toBe('Back')
      expect(isPrimaryDisabled(wrapper)).toBe(true)

      await wrapper.find('[data-testid="setup-valid"]').trigger('click')

      expect(isPrimaryDisabled(wrapper)).toBe(false)
    })

    it('going back drops the validity the setup step reported', async () => {
      const { wrapper } = getWrapper()
      await toggleEncrypt(wrapper)
      await submitStep(wrapper)
      await wrapper.find('[data-testid="setup-valid"]').trigger('click')

      await secondary(wrapper).trigger('click')

      expect(wrapper.find('#create-folder-input').exists()).toBeTruthy()
      expect(primary(wrapper).text()).toBe('Continue')
      expect(secondary(wrapper).exists()).toBe(false)
    })
  })

  describe('vault name in the input', () => {
    it('shows the vault name once encryption is on and extensions are visible', async () => {
      const { wrapper } = getWrapper()
      await setName(wrapper, 'myfolder')

      await toggleEncrypt(wrapper)
      expect(nameValue(wrapper)).toBe('myfolder.vault')

      await toggleEncrypt(wrapper)
      expect(nameValue(wrapper)).toBe('myfolder')
    })

    it('keeps the plain name when extensions are hidden', async () => {
      const { wrapper } = getWrapper({ areFileExtensionsShown: false })
      await setName(wrapper, 'myfolder')
      await toggleEncrypt(wrapper)

      expect(nameValue(wrapper)).toBe('myfolder')
    })

    it('does not stack the marker when the user typed it themselves', async () => {
      const { wrapper } = getWrapper()
      await setName(wrapper, 'myfolder.vault')
      await toggleEncrypt(wrapper)

      expect(nameValue(wrapper)).toBe('myfolder.vault')
    })

    it('uses the marker of the scheme, not a hardcoded one', async () => {
      const { wrapper } = getWrapper({ vaultExtension: 'crypt' })
      await setName(wrapper, 'myfolder')
      await toggleEncrypt(wrapper)

      expect(nameValue(wrapper)).toBe('myfolder.crypt')
    })
  })

  describe('suggested name', () => {
    it('numbers up when the plain name is taken', () => {
      const { wrapper } = getWrapper({ resources: [resource('New folder')] })

      expect(nameValue(wrapper)).toBe('New folder (1)')
    })

    it('numbers up against existing vaults once encryption is on', async () => {
      // only the vault exists, so the plain suggestion is free but the vault
      // name it would turn into is not
      const { wrapper } = getWrapper({ resources: [resource('New folder.vault')] })
      expect(nameValue(wrapper)).toBe('New folder')

      await toggleEncrypt(wrapper)

      expect(nameValue(wrapper)).toBe('New folder (1).vault')
      expect(isPrimaryDisabled(wrapper)).toBe(false)
    })

    it('numbers up against existing vaults with extensions hidden too', async () => {
      const { wrapper } = getWrapper({
        areFileExtensionsShown: false,
        resources: [resource('New folder.vault')]
      })
      await toggleEncrypt(wrapper)

      expect(nameValue(wrapper)).toBe('New folder (1)')
      expect(isPrimaryDisabled(wrapper)).toBe(false)
    })

    it('ignores a plain sibling when suggesting a vault name', async () => {
      // `New folder` and `New folder.vault` can coexist, so encrypting does not
      // have to dodge the plain folder
      const { wrapper } = getWrapper({ resources: [resource('New folder')] })
      expect(nameValue(wrapper)).toBe('New folder (1)')

      await toggleEncrypt(wrapper)

      expect(nameValue(wrapper)).toBe('New folder.vault')
    })

    it('re-suggests on the way back to a plain folder', async () => {
      const { wrapper } = getWrapper({ resources: [resource('New folder.vault')] })
      await toggleEncrypt(wrapper)
      expect(nameValue(wrapper)).toBe('New folder (1).vault')

      await toggleEncrypt(wrapper)

      expect(nameValue(wrapper)).toBe('New folder')
    })

    it('leaves an edited name alone so the error surfaces instead', async () => {
      const { wrapper } = getWrapper({ resources: [resource('myfolder.vault')] })
      await setName(wrapper, 'myfolder')

      await toggleEncrypt(wrapper)

      expect(nameValue(wrapper)).toBe('myfolder.vault')
      expect(isPrimaryDisabled(wrapper)).toBe(true)
    })
  })

  describe('method "onConfirm"', () => {
    it('hands over the plain name when extensions are hidden', async () => {
      const callbackFn = vi.fn()
      const { wrapper } = getWrapper({ callbackFn, areFileExtensionsShown: false })
      await setName(wrapper, 'myfolder')
      await toggleEncrypt(wrapper)
      await submitStep(wrapper)
      await wrapper.find('[data-testid="setup-valid"]').trigger('click')

      await wrapper.vm.onConfirm()

      // the caller applies the vault naming in this case
      expect(callbackFn).toHaveBeenCalledWith('myfolder', {
        encrypt: true,
        finalizeVault: finalize
      })
    })

    it('hands the name shown in the field and the setup step’s finalize to the callback', async () => {
      const callbackFn = vi.fn()
      const { wrapper } = getWrapper({ callbackFn })
      await setName(wrapper, 'myfolder')
      await toggleEncrypt(wrapper)
      await submitStep(wrapper)
      await wrapper.find('[data-testid="setup-valid"]').trigger('click')

      await wrapper.vm.onConfirm()

      expect(callbackFn).toHaveBeenCalledWith('myfolder.vault', {
        encrypt: true,
        finalizeVault: finalize
      })
    })

    it('still creates once the modal wrapper has flipped the loading state on', async () => {
      // The wrapper sets `isLoading` before it calls us, so the in-flight guard
      // on the button must not block the confirm path itself.
      const callbackFn = vi.fn()
      const { wrapper } = getWrapper({ callbackFn, isLoading: true })
      await setName(wrapper, 'myfolder')

      await wrapper.vm.onConfirm()

      expect(callbackFn).toHaveBeenCalledWith('myfolder', {
        encrypt: false,
        finalizeVault: undefined
      })
    })

    it('rejects while the setup step is still pending', async () => {
      const callbackFn = vi.fn()
      const { wrapper } = getWrapper({ callbackFn })
      await toggleEncrypt(wrapper)

      await expect(wrapper.vm.onConfirm()).rejects.toBeUndefined()
      expect(callbackFn).not.toHaveBeenCalled()
    })

    it('rejects while the name is invalid so the modal stays open', async () => {
      const callbackFn = vi.fn()
      const { wrapper } = getWrapper({ callbackFn })
      await setName(wrapper, '')

      await expect(wrapper.vm.onConfirm()).rejects.toBeUndefined()
      expect(callbackFn).not.toHaveBeenCalled()
    })
  })
})

type Wrapper = ReturnType<typeof getWrapper>['wrapper']

function primary(wrapper: Wrapper) {
  return wrapper.find('.oc-modal-body-actions-confirm')
}

function secondary(wrapper: Wrapper) {
  return wrapper.find('.oc-modal-body-actions-cancel')
}

function isPrimaryDisabled(wrapper: Wrapper) {
  return (primary(wrapper).element as HTMLButtonElement).disabled
}

// The primary button is a submit button, so both clicking it and pressing enter
// go through the form's submit event - which is the path exercised here.
function submitStep(wrapper: Wrapper) {
  return wrapper.find('form').trigger('submit')
}

function setName(wrapper: Wrapper, name: string) {
  return wrapper.find('#create-folder-input').setValue(name)
}

function resource(name: string) {
  return mock<Resource>({ name, path: `/${name}` })
}

function nameValue(wrapper: Wrapper) {
  return (wrapper.find('#create-folder-input').element as HTMLInputElement).value
}

function toggleEncrypt(wrapper: Wrapper) {
  return wrapper.find('[data-testid="oc-switch-btn"]').trigger('click')
}

function getWrapper({
  canEncrypt = true,
  vaultExtension = 'vault',
  areFileExtensionsShown = true,
  isLoading = false,
  callbackFn = vi.fn(),
  resources = [] as Resource[]
} = {}) {
  const mocks = { ...defaultComponentMocks() }

  return {
    mocks,
    wrapper: mount(CreateFolderModal, {
      props: {
        modal: mock<Modal>({ isLoading }),
        vaultCreation: canEncrypt
          ? {
              vaultExtension,
              vaultContentType: 'application/vnd.opencloud.vault',
              setupComponent: SetupStub
            }
          : undefined,
        callbackFn
      },
      global: {
        plugins: [
          ...defaultPlugins({
            piniaOptions: {
              resourcesStore: {
                currentFolder: mock<Resource>({ id: '1', path: '/' }),
                resources,
                areFileExtensionsShown
              }
            }
          })
        ],
        mocks,
        provide: mocks
      }
    })
  }
}
