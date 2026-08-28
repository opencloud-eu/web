import { mock } from 'vitest-mock-extended'
import { defineComponent, h } from 'vue'
import CreateSpaceModal from '../../../../src/components/Modals/CreateSpaceModal.vue'
import { defaultComponentMocks, defaultPlugins, mount } from '@opencloud-eu/web-test-helpers'
import { getVaultCreator, Modal, useCreateSpace } from '@opencloud-eu/web-pkg'

vi.mock('@opencloud-eu/web-pkg', async (importOriginal) => ({
  ...(await importOriginal<any>()),
  getVaultCreator: vi.fn(),
  useCreateSpace: vi.fn()
}))

const addNewSpace = vi.fn()
const finalize = vi.fn()

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

describe('CreateSpaceModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('offers encryption when a vault scheme can create vaults', () => {
    const { wrapper } = getWrapper()

    expect(wrapper.find('[data-testid="create-space-encrypt"]').exists()).toBeTruthy()
  })

  it('hides encryption when no vault scheme is available', () => {
    const { wrapper } = getWrapper({ canEncrypt: false })

    expect(wrapper.find('[data-testid="create-space-encrypt"]').exists()).toBeFalsy()
  })

  it('flips the lock icon closed once encryption is toggled on', async () => {
    const { wrapper } = getWrapper()
    const lockIcon = () =>
      wrapper.find('[data-testid="create-space-encrypt"]').findComponent({ name: 'OcIcon' })

    expect(lockIcon().props('name')).toBe('lock-unlock')

    await toggleEncrypt(wrapper)

    expect(lockIcon().props('name')).toBe('lock-2')
  })

  it('suggests a name and never marks it, encrypted or not', async () => {
    const { wrapper } = getWrapper()
    expect(nameValue(wrapper)).toBe('New space')

    await toggleEncrypt(wrapper)

    expect(nameValue(wrapper)).toBe('New space')
  })

  it('disables the primary button while the name is invalid', async () => {
    const { wrapper } = getWrapper()
    expect(isPrimaryDisabled(wrapper)).toBe(false)

    await setName(wrapper, '')

    expect(isPrimaryDisabled(wrapper)).toBe(true)
  })

  describe('the setup step', () => {
    it('is skipped for an unencrypted space', async () => {
      const { wrapper } = getWrapper()

      await submitStep(wrapper)

      expect(wrapper.find('[data-testid="setup-stub"]').exists()).toBeFalsy()
    })

    it('follows the name step once encryption is on and gets the space name', async () => {
      const { wrapper } = getWrapper()
      await setName(wrapper, 'Secrets')
      await toggleEncrypt(wrapper)

      await submitStep(wrapper)

      expect(wrapper.find('[data-testid="setup-stub"]').text()).toContain('Secrets')
      // the scheme reported itself invalid on mount
      expect(isPrimaryDisabled(wrapper)).toBe(true)
    })

    it('can be left again, dropping the validity it reported', async () => {
      const { wrapper } = getWrapper()
      await toggleEncrypt(wrapper)
      await submitStep(wrapper)
      await wrapper.find('[data-testid="setup-valid"]').trigger('click')
      expect(isPrimaryDisabled(wrapper)).toBe(false)

      await secondary(wrapper).trigger('click')

      expect(wrapper.find('#create-space-input').exists()).toBeTruthy()
      await submitStep(wrapper)
      expect(isPrimaryDisabled(wrapper)).toBe(true)
    })
  })

  describe('method "onConfirm"', () => {
    it('hands the name and the setup step’s finalize to the space creation', async () => {
      const { wrapper } = getWrapper()
      await setName(wrapper, 'Secrets')
      await toggleEncrypt(wrapper)
      await submitStep(wrapper)
      await wrapper.find('[data-testid="setup-valid"]').trigger('click')

      await wrapper.vm.onConfirm()

      expect(addNewSpace).toHaveBeenCalledWith('Secrets', {
        encrypt: true,
        finalizeVault: finalize
      })
    })

    it('creates an unencrypted space without a finalize', async () => {
      const { wrapper } = getWrapper()
      await setName(wrapper, 'Team')

      await wrapper.vm.onConfirm()

      expect(addNewSpace).toHaveBeenCalledWith('Team', {
        encrypt: false,
        finalizeVault: undefined
      })
    })

    it('still creates once the modal wrapper has flipped the loading state on', async () => {
      // The wrapper sets `isLoading` before it calls us, so the in-flight guard
      // on the button must not block the confirm path itself.
      const { wrapper } = getWrapper({ isLoading: true })

      await wrapper.vm.onConfirm()

      expect(addNewSpace).toHaveBeenCalledWith('New space', {
        encrypt: false,
        finalizeVault: undefined
      })
    })

    it('rejects while the setup step is still pending', async () => {
      const { wrapper } = getWrapper()
      await toggleEncrypt(wrapper)

      await expect(wrapper.vm.onConfirm()).rejects.toBeUndefined()
      expect(addNewSpace).not.toHaveBeenCalled()
    })

    it('rejects while the name is invalid so the modal stays open', async () => {
      const { wrapper } = getWrapper()
      await setName(wrapper, '')

      await expect(wrapper.vm.onConfirm()).rejects.toBeUndefined()
      expect(addNewSpace).not.toHaveBeenCalled()
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

function toggleEncrypt(wrapper: Wrapper) {
  return wrapper.find('[data-testid="oc-switch-btn"]').trigger('click')
}

function submitStep(wrapper: Wrapper) {
  return wrapper.find('form').trigger('submit')
}

function setName(wrapper: Wrapper, name: string) {
  return wrapper.find('#create-space-input').setValue(name)
}

function nameValue(wrapper: Wrapper) {
  return (wrapper.find('#create-space-input').element as HTMLInputElement).value
}

function getWrapper({ canEncrypt = true, isLoading = false } = {}) {
  const mocks = { ...defaultComponentMocks() }

  vi.mocked(useCreateSpace).mockReturnValue(
    mock<ReturnType<typeof useCreateSpace>>({ addNewSpace })
  )
  vi.mocked(getVaultCreator).mockReturnValue(
    canEncrypt ? ({ creation: { setupComponent: SetupStub } } as any) : null
  )

  return {
    mocks,
    wrapper: mount(CreateSpaceModal, {
      props: {
        modal: mock<Modal>({ isLoading })
      },
      global: {
        plugins: [...defaultPlugins()],
        mocks,
        provide: mocks
      }
    })
  }
}
