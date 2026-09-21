import { mock } from 'vitest-mock-extended'
import { defineComponent, h } from 'vue'
import CreateSpaceModal from '../../../../src/components/Modals/CreateSpaceModal.vue'
import { defaultComponentMocks, defaultPlugins, mount } from '@opencloud-eu/web-test-helpers'
import {
  getVaultCreator,
  Modal,
  SpaceImageModal,
  useCreateSpace,
  useModals
} from '@opencloud-eu/web-pkg'
import { AbilityRule, SpaceResource } from '@opencloud-eu/web-client'

vi.mock('@opencloud-eu/web-pkg', async (importOriginal) => ({
  ...(await importOriginal<any>()),
  getVaultCreator: vi.fn(),
  useCreateSpace: vi.fn()
}))

window.URL.createObjectURL = vi.fn(() => 'blob:preview')
window.URL.revokeObjectURL = vi.fn()

const addNewSpace = vi.fn()
const finalize = vi.fn()
const imageContent = new ArrayBuffer(8)

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

  it('counts the suggested name up past the spaces that already use it', () => {
    const existing = (name: string) => mock<SpaceResource>({ name, driveType: 'project' })
    const { wrapper } = getWrapper({
      spaces: [existing('New space'), existing('New space (1)')]
    })

    expect(nameValue(wrapper)).toBe('New space (2)')
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

      expect(addNewSpace).toHaveBeenCalledWith(
        'Secrets',
        expect.objectContaining({ encrypt: true, finalizeVault: finalize })
      )
    })

    it('creates an unencrypted space without a finalize', async () => {
      const { wrapper } = getWrapper()
      await setName(wrapper, 'Team')

      await wrapper.vm.onConfirm()

      expect(addNewSpace).toHaveBeenCalledWith(
        'Team',
        expect.objectContaining({ encrypt: false, finalizeVault: undefined })
      )
    })

    it('still creates once the modal wrapper has flipped the loading state on', async () => {
      // The wrapper sets `isLoading` before it calls us, so the in-flight guard
      // on the button must not block the confirm path itself.
      const { wrapper } = getWrapper({ isLoading: true })

      await wrapper.vm.onConfirm()

      expect(addNewSpace).toHaveBeenCalledWith(
        'New space',
        expect.objectContaining({ encrypt: false, finalizeVault: undefined })
      )
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

  describe('the options', () => {
    it('stay hidden until they are revealed', async () => {
      const { wrapper } = getWrapper()
      expect(wrapper.find('.create-space-presentation-toggle').exists()).toBeFalsy()

      await revealOptions(wrapper)

      expect(wrapper.find('.create-space-options-toggle').exists()).toBeFalsy()
      expect(wrapper.find('.create-space-presentation-toggle').exists()).toBeTruthy()
    })

    it('start out with presentation open and advanced folded', async () => {
      const { wrapper } = getWrapper({
        abilities: [{ action: 'set-quota-all', subject: 'Drive' }]
      })

      await revealOptions(wrapper)

      expect(wrapper.find('#create-space-subtitle-input').exists()).toBeTruthy()
      expect(wrapper.find('.create-space-quota').exists()).toBeFalsy()

      await expandAdvanced(wrapper)

      expect(wrapper.find('.create-space-quota').exists()).toBeTruthy()

      await expandPresentation(wrapper)

      expect(wrapper.find('#create-space-subtitle-input').exists()).toBeFalsy()
    })

    it('scrolls a category into view when it is opened, not when it is closed', async () => {
      const scrollIntoView = vi.fn()
      Element.prototype.scrollIntoView = scrollIntoView
      const { wrapper } = getWrapper()
      await revealOptions(wrapper)

      await expandAdvanced(wrapper)

      expect(scrollIntoView).toHaveBeenCalledTimes(1)

      await expandAdvanced(wrapper)

      expect(scrollIntoView).toHaveBeenCalledTimes(1)
    })

    it('offer a quota only to users who may set one', async () => {
      const { wrapper } = getWrapper()
      await revealOptions(wrapper)
      await expandAdvanced(wrapper)

      expect(wrapper.find('.create-space-quota').exists()).toBeFalsy()

      const { wrapper: privileged } = getWrapper({
        abilities: [{ action: 'set-quota-all', subject: 'Drive' }]
      })
      await revealOptions(privileged)
      await expandAdvanced(privileged)

      expect(privileged.find('.create-space-quota').exists()).toBeTruthy()
    })

    it('drop the description and the image for an encrypted space', async () => {
      const { wrapper } = getWrapper()
      await revealOptions(wrapper)
      expect(wrapper.find('.create-space-description').exists()).toBeTruthy()
      expect(wrapper.find('.create-space-image').exists()).toBeTruthy()

      await toggleEncrypt(wrapper)

      expect(wrapper.find('.create-space-description').exists()).toBeFalsy()
      expect(wrapper.find('.create-space-image').exists()).toBeFalsy()
    })

    it('are handed to the space creation', async () => {
      const { wrapper } = getWrapper()
      await revealOptions(wrapper)
      await wrapper.find('#create-space-subtitle-input').setValue('Everything team')
      await setDescription(wrapper, 'What we do here')

      await wrapper.vm.onConfirm()

      expect(addNewSpace).toHaveBeenCalledWith(
        'New space',
        expect.objectContaining({
          subtitle: 'Everything team',
          description: 'What we do here',
          members: []
        })
      )
    })

    it('crop a picked image in a modal of its own and keep the result', async () => {
      const { wrapper } = getWrapper()
      await revealOptions(wrapper)

      await pickImage(wrapper, new File([''], 'logo.png'))

      const { dispatchModal } = useModals()
      expect(dispatchModal).toHaveBeenCalledWith(
        expect.objectContaining({ customComponent: SpaceImageModal })
      )

      const { save, file } = dispatchModalAttrs()
      expect(file.name).toBe('logo.png')
      save(imageContent)

      await wrapper.vm.onConfirm()

      expect(addNewSpace).toHaveBeenCalledWith(
        'New space',
        expect.objectContaining({ image: imageContent })
      )
    })

    it('keep the description out of an encrypted space', async () => {
      const { wrapper } = getWrapper()
      await revealOptions(wrapper)
      await wrapper.find('#create-space-subtitle-input').setValue('Everything team')
      await setDescription(wrapper, 'What we do here')
      await toggleEncrypt(wrapper)
      await submitStep(wrapper)
      await wrapper.find('[data-testid="setup-valid"]').trigger('click')

      await wrapper.vm.onConfirm()

      expect(addNewSpace).toHaveBeenCalledWith(
        'New space',
        expect.objectContaining({
          subtitle: 'Everything team',
          description: undefined,
          image: undefined
        })
      )
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

function expandPresentation(wrapper: Wrapper) {
  return wrapper.find('.create-space-presentation-toggle').trigger('click')
}

function expandAdvanced(wrapper: Wrapper) {
  return wrapper.find('.create-space-advanced-toggle').trigger('click')
}

function setDescription(wrapper: Wrapper, description: string) {
  wrapper
    .findComponent<any>({ name: 'CreateSpaceOptions' })
    .vm.$emit('update:description', description)
  return wrapper.vm.$nextTick()
}

function pickImage(wrapper: Wrapper, file: File) {
  const input = wrapper.find('.create-space-image input[type="file"]')
  Object.defineProperty(input.element, 'files', { value: [file], configurable: true })
  return input.trigger('change')
}

function dispatchModalAttrs() {
  const { dispatchModal } = useModals()
  const [{ customComponentAttrs }] = vi.mocked(dispatchModal).mock.calls.at(-1)
  return customComponentAttrs() as { file: File; save: (content: ArrayBuffer) => void }
}

function revealOptions(wrapper: Wrapper) {
  return wrapper.find('.create-space-options-toggle').trigger('click')
}

function setName(wrapper: Wrapper, name: string) {
  return wrapper.find('#create-space-input').setValue(name)
}

function nameValue(wrapper: Wrapper) {
  return (wrapper.find('#create-space-input').element as HTMLInputElement).value
}

function getWrapper({
  canEncrypt = true,
  isLoading = false,
  abilities = [] as AbilityRule[],
  spaces = [] as SpaceResource[]
} = {}) {
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
        plugins: [...defaultPlugins({ abilities, piniaOptions: { spacesState: { spaces } } })],
        mocks,
        provide: mocks
      }
    })
  }
}
