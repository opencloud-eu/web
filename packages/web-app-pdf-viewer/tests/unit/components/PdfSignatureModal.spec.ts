import { mock } from 'vitest-mock-extended'
import { flushPromises } from '@vue/test-utils'
import type { Modal } from '@opencloud-eu/web-pkg'
import { defaultPlugins, mount } from '@opencloud-eu/web-test-helpers'
import PdfSignatureModal from '../../../src/components/PdfSignatureModal.vue'
import type { SignatureData } from '../../../src/composables/usePdfSignature'

type Exposed = { onConfirm: () => Promise<void> }
type Wrapper = ReturnType<typeof createWrapper>['wrapper']

// PDF.js' signature data is passed through as is, the width tells them apart.
function signatureData(width: number): SignatureData {
  return {
    newCurves: [],
    areContours: true,
    thickness: 0,
    width,
    height: 5,
    outline: { viewBox: '0 0 10 5', toSVGPath: () => 'M0 0L10 5' }
  }
}

const drawnSignature = signatureData(1)
const textSignature = signatureData(2)
const imageSignature = signatureData(3)

function createWrapper({
  imageData = imageSignature as SignatureData | null,
  canSave = true,
  pickImageFromCloud = undefined as ((onImage: (file: File) => void) => void) | undefined
} = {}) {
  const props = {
    modal: mock<Modal>(),
    canSave,
    pickImageFromCloud,
    getDrawnSignature: vi.fn(() => drawnSignature),
    getFromText: vi.fn<() => SignatureData | null>(() => textSignature),
    getFromImage: vi.fn().mockResolvedValue(imageData),
    onSave: vi.fn()
  }
  const wrapper = mount(PdfSignatureModal, {
    props,
    global: { plugins: [...defaultPlugins()], stubs: { 'oc-icon': true } }
  })
  return { wrapper, ...props }
}

function confirm(wrapper: Wrapper) {
  return (wrapper.vm as unknown as Exposed).onConfirm()
}

function confirmDisabled(wrapper: Wrapper) {
  return wrapper.emitted('update:confirmDisabled').at(-1)[0]
}

function description(wrapper: Wrapper) {
  return wrapper.find<HTMLInputElement>('.pdf-viewer-signature-description input')
}

async function typeName(wrapper: Wrapper, text: string) {
  await wrapper.find('.pdf-viewer-signature-tab-type').trigger('click')
  await wrapper.find('.pdf-viewer-signature-type input').setValue(text)
}

async function chooseImage(wrapper: Wrapper, name: string) {
  await wrapper.find('.pdf-viewer-signature-tab-image').trigger('click')
  const input = wrapper.find('.pdf-viewer-signature-image input[type="file"]')
  Object.defineProperty(input.element, 'files', {
    value: [new File(['x'], name, { type: 'image/png' })]
  })
  await input.trigger('change')
  await flushPromises()
}

describe('PdfSignatureModal', () => {
  it('can only be confirmed once there is a signature', () => {
    const { wrapper } = createWrapper()
    expect(confirmDisabled(wrapper)).toBe(true)
  })

  it('creates a signature from typed text, described by the text', async () => {
    const { wrapper, getFromText, onSave } = createWrapper()
    await typeName(wrapper, '  Jane Doe ')
    expect(confirmDisabled(wrapper)).toBe(false)
    await confirm(wrapper)
    expect(getFromText).toHaveBeenCalledWith('Jane Doe', expect.anything())
    expect(onSave).toHaveBeenCalledWith(textSignature, 'Jane Doe', true)
  })

  it('creates a signature from an image, described by the file name', async () => {
    const { wrapper, getFromImage, onSave } = createWrapper()
    await chooseImage(wrapper, 'sig.png')
    expect(getFromImage).toHaveBeenCalledWith(expect.objectContaining({ name: 'sig.png' }))
    expect(confirmDisabled(wrapper)).toBe(false)
    await confirm(wrapper)
    expect(onSave).toHaveBeenCalledWith(imageSignature, 'sig.png', true)
  })

  it('creates a signature from an image picked from the cloud, below the image area', async () => {
    const pickImageFromCloud = vi.fn((onImage: (file: File) => void) =>
      onImage(new File(['x'], 'cloud.png', { type: 'image/png' }))
    )
    const { wrapper, getFromImage } = createWrapper({ pickImageFromCloud })
    expect(wrapper.find('.pdf-viewer-signature-image-cloud').exists()).toBe(false)
    await wrapper.find('.pdf-viewer-signature-tab-image').trigger('click')
    await wrapper.find('.pdf-viewer-signature-image-cloud').trigger('click')
    await flushPromises()
    expect(getFromImage).toHaveBeenCalledWith(expect.objectContaining({ name: 'cloud.png' }))
    expect(description(wrapper).element.value).toBe('cloud.png')
    expect(confirmDisabled(wrapper)).toBe(false)
    // Not with an image chosen, nor without the picker (e.g. on public links).
    expect(wrapper.find('.pdf-viewer-signature-image-cloud').exists()).toBe(false)
    const { wrapper: other } = createWrapper()
    await other.find('.pdf-viewer-signature-tab-image').trigger('click')
    expect(other.find('.pdf-viewer-signature-image-cloud').exists()).toBe(false)
  })

  it('can not be confirmed with an image without a signature', async () => {
    const { wrapper } = createWrapper({ imageData: null })
    await chooseImage(wrapper, 'photo.png')
    expect(confirmDisabled(wrapper)).toBe(true)
  })

  // E.g. a font that draws nothing.
  it('stays open and explains it when no signature can be created', async () => {
    const { wrapper, getFromText, onSave } = createWrapper()
    getFromText.mockReturnValue(null)
    await typeName(wrapper, '?')
    await expect(confirm(wrapper)).rejects.toThrow()
    expect(onSave).not.toHaveBeenCalled()
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.pdf-viewer-signature-error').exists()).toBe(true)
  })

  // The dialog's loading state ends only for a rejection, e.g. PDF.js gets no canvas context.
  it('rejects when creating the signature fails', async () => {
    const { wrapper, getFromText, onSave } = createWrapper()
    getFromText.mockImplementation(() => {
      throw new Error('No canvas context')
    })
    await typeName(wrapper, 'Jane Doe')
    await expect(confirm(wrapper)).rejects.toThrow('No canvas context')
    expect(onSave).not.toHaveBeenCalled()
  })

  // Like in the PDF.js viewer, the description is shown with saved signatures as well.
  describe('description', () => {
    it('follows the typed text until it is changed, each tab has its own', async () => {
      const { wrapper, onSave } = createWrapper()
      await wrapper.find('.pdf-viewer-signature-tab-type').trigger('click')
      expect(description(wrapper).attributes('disabled')).toBeDefined()
      await typeName(wrapper, 'Jane')
      expect(description(wrapper).element.value).toBe('Jane')
      await description(wrapper).setValue('My signature')
      await typeName(wrapper, 'Jane Doe')
      expect(description(wrapper).element.value).toBe('My signature')
      await wrapper.find('.pdf-viewer-signature-tab-image').trigger('click')
      expect(description(wrapper).element.value).toBe('')
      await wrapper.find('.pdf-viewer-signature-tab-type').trigger('click')
      await confirm(wrapper)
      expect(onSave).toHaveBeenCalledWith(textSignature, 'My signature', true)
    })

    // What the field shows is what is used, like in the PDF.js viewer.
    it.each(['delete', 'clear button'])('stays empty once cleared (%s)', async (way) => {
      const { wrapper, onSave } = createWrapper()
      await typeName(wrapper, 'Jane Doe')
      if (way === 'delete') {
        await description(wrapper).setValue('')
      } else {
        await wrapper
          .find('.pdf-viewer-signature-description .oc-text-input-btn-clear')
          .trigger('click')
      }
      expect(description(wrapper).element.value).toBe('')
      await confirm(wrapper)
      expect(onSave).toHaveBeenCalledWith(textSignature, '', true)
    })

    it('follows the typed text again once back at it', async () => {
      const { wrapper } = createWrapper()
      await typeName(wrapper, 'Jane')
      await description(wrapper).setValue('Mine')
      await description(wrapper).setValue('Jane')
      await typeName(wrapper, 'Jane Doe')
      expect(description(wrapper).element.value).toBe('Jane Doe')
    })

    it('gets the default again for a new image once cleared, like the PDF.js viewer', async () => {
      const { wrapper } = createWrapper()
      await chooseImage(wrapper, 'sig.png')
      await description(wrapper).setValue('')
      await wrapper.find('.pdf-viewer-signature-image-clear').trigger('click')
      await chooseImage(wrapper, 'other.png')
      expect(description(wrapper).element.value).toBe('other.png')
    })

    it('stays empty when no signature was found in the image', async () => {
      const { wrapper } = createWrapper({ imageData: null })
      await chooseImage(wrapper, 'notes.txt')
      expect(description(wrapper).element.value).toBe('')
    })
  })

  describe('saving for reuse', () => {
    it('is on while there is room, and can be turned off', async () => {
      const { wrapper, onSave } = createWrapper()
      // Where they are kept, the only hint while there is room.
      const helpers = wrapper.findAllComponents({ name: 'OcContextualHelper' })
      expect(helpers).toHaveLength(1)
      expect(helpers[0].props('text')).toContain('only kept while the PDF viewer is open')
      await typeName(wrapper, 'Jane Doe')
      const toggle = wrapper.find('.pdf-viewer-signature-save .oc-switch-btn')
      expect(toggle.attributes('aria-checked')).toBe('true')
      await toggle.trigger('click')
      await confirm(wrapper)
      expect(onSave).toHaveBeenCalledWith(textSignature, 'Jane Doe', false)
    })

    it('is off and explained when the limit is reached', async () => {
      const { wrapper, onSave } = createWrapper({ canSave: false })
      expect(
        wrapper.find('.pdf-viewer-signature-save .oc-switch-btn').attributes('disabled')
      ).toBeDefined()
      // Instead of the one about the browser, not both.
      const helpers = wrapper.findAllComponents({ name: 'OcContextualHelper' })
      expect(helpers).toHaveLength(1)
      expect(helpers[0].props('text')).toContain('limit of 5 saved signatures')
      await typeName(wrapper, 'Jane Doe')
      await confirm(wrapper)
      expect(onSave).toHaveBeenCalledWith(textSignature, 'Jane Doe', false)
    })
  })
})
