import { flushPromises } from '@vue/test-utils'
import { defaultPlugins, mount } from '@opencloud-eu/web-test-helpers'
import PdfSignatureImage from '../../../src/components/PdfSignatureImage.vue'
import type { SignatureData } from '../../../src/composables/usePdfSignature'

function imageSignature(width = 10): SignatureData {
  return {
    newCurves: [],
    areContours: true,
    thickness: 0,
    width,
    height: 5,
    outline: { viewBox: '0 0 10 5', toSVGPath: () => 'M0 0L10 5' }
  }
}

function createWrapper(found: SignatureData | null = imageSignature()) {
  const getFromImage = vi.fn().mockResolvedValue(found)
  const wrapper = mount(PdfSignatureImage, {
    props: {
      getFromImage,
      data: null,
      fileName: '',
      'onUpdate:data': (data: SignatureData | null) => wrapper.setProps({ data }),
      'onUpdate:fileName': (fileName: string) => wrapper.setProps({ fileName })
    },
    global: { plugins: [...defaultPlugins()], stubs: { 'oc-icon': true } }
  })
  return { wrapper, getFromImage }
}

async function chooseFile(
  wrapper: ReturnType<typeof createWrapper>['wrapper'],
  name: string,
  type = 'image/png'
) {
  const input = wrapper.find('input[type="file"]')
  Object.defineProperty(input.element, 'files', {
    value: [new File(['x'], name, { type })],
    configurable: true
  })
  await input.trigger('change')
}

describe('PdfSignatureImage', () => {
  // Like in the PDF.js viewer, instead of the photo cut into a circle.
  it('shows the signature found in an image on paper, which can be cleared', async () => {
    const { wrapper, getFromImage } = createWrapper()
    await chooseFile(wrapper, 'sig.png')
    await flushPromises()
    expect(getFromImage).toHaveBeenCalledWith(expect.objectContaining({ name: 'sig.png' }))
    expect(wrapper.props('fileName')).toBe('sig.png')
    expect(wrapper.find('.pdf-viewer-signature-image-preview path').attributes('d')).toBe(
      'M0 0L10 5'
    )
    await wrapper.find('.pdf-viewer-signature-image-clear').trigger('click')
    expect(wrapper.props('data')).toBeNull()
    expect(wrapper.props('fileName')).toBe('')
    expect(wrapper.find('.pdf-viewer-signature-image-preview').exists()).toBe(false)
    expect(wrapper.find('input[type="file"]').exists()).toBe(true)
  })

  it('explains images without a signature', async () => {
    const { wrapper } = createWrapper(null)
    await chooseFile(wrapper, 'photo.png')
    await flushPromises()
    expect(wrapper.find('.oc-file-input-message').text()).toBe(
      'No signature could be found in this image.'
    )
    expect(wrapper.props('data')).toBeNull()
    expect(wrapper.props('fileName')).toBe('')
  })

  it('uses the last chosen image if an earlier one takes longer', async () => {
    const { wrapper, getFromImage } = createWrapper()
    let resolveFirst: (data: SignatureData) => void
    getFromImage
      .mockReturnValueOnce(new Promise((resolve) => (resolveFirst = resolve)))
      .mockResolvedValueOnce(imageSignature(2))
    await chooseFile(wrapper, 'first.png')
    await chooseFile(wrapper, 'second.png')
    await flushPromises()
    resolveFirst(imageSignature(1))
    await flushPromises()
    expect(wrapper.props('data')).toEqual(expect.objectContaining({ width: 2 }))
    expect(wrapper.props('fileName')).toBe('second.png')
  })

  // Any raster image that PDF.js supports.
  it('uses AVIF images', async () => {
    const { wrapper, getFromImage } = createWrapper()
    expect(wrapper.find('input[type="file"]').attributes('accept').split(',')).toContain(
      'image/avif'
    )
    await chooseFile(wrapper, 'sig.avif', 'image/avif')
    await flushPromises()
    expect(getFromImage).toHaveBeenCalledWith(expect.objectContaining({ name: 'sig.avif' }))
    expect(wrapper.props('fileName')).toBe('sig.avif')
  })

  it('takes an image from elsewhere, e.g. picked from the cloud', async () => {
    const { wrapper, getFromImage } = createWrapper()
    const file = new File(['x'], 'from-cloud.png', { type: 'image/png' })
    wrapper.vm.useImage(file)
    await flushPromises()
    expect(getFromImage).toHaveBeenCalledWith(file)
    expect(wrapper.props('fileName')).toBe('from-cloud.png')
  })

  describe('vector images', () => {
    beforeEach(() => {
      vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:preview')
      vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    })
    afterEach(() => vi.restoreAllMocks())

    it('offers raster images only', () => {
      const { wrapper } = createWrapper()
      const accept = wrapper.find('input[type="file"]').attributes('accept')
      expect(accept.split(',')).toEqual(expect.arrayContaining(['image/png', 'image/jpeg']))
      expect(accept).not.toContain('svg')
      expect(accept).not.toContain('image/*')
    })

    // The file input would show the file itself as preview.
    it('neither shows nor uses an SVG chosen anyway', async () => {
      const { wrapper, getFromImage } = createWrapper()
      await chooseFile(wrapper, 'sig.svg', 'image/svg+xml')
      await flushPromises()
      expect(URL.createObjectURL).not.toHaveBeenCalled()
      expect(getFromImage).not.toHaveBeenCalled()
      expect(wrapper.find('.oc-file-input-message').text()).toBe(
        'No signature could be found in this image.'
      )
      expect(wrapper.props('data')).toBeNull()

      await chooseFile(wrapper, 'sig.png')
      await flushPromises()
      expect(URL.createObjectURL).toHaveBeenCalledTimes(1)
      expect(getFromImage).toHaveBeenCalled()
    })

    it('does not use an SVG from elsewhere, e.g. picked from the cloud', async () => {
      const { wrapper, getFromImage } = createWrapper()
      wrapper.vm.useImage(new File(['x'], 'from-cloud.svg', { type: 'image/svg+xml' }))
      await flushPromises()
      expect(getFromImage).not.toHaveBeenCalled()
      expect(wrapper.props('data')).toBeNull()
      expect(wrapper.find('.oc-file-input-message').text()).toBe(
        'No signature could be found in this image.'
      )
    })
  })
})
