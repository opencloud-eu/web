import { useCropperKeyboardActions } from '../../../../src/composables/keyboardActions'
import { getComposableWrapper } from '@opencloud-eu/web-test-helpers'
import { ref } from 'vue'
import type { CropperImage, CropperSelection } from 'cropperjs'

describe('useCropperKeyboardActions', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it.each([
    ['plain "+" (e.g. numpad)', { key: '+' }],
    ['Shift + "=" (e.g. US layout)', { key: '+', shiftKey: true }]
  ])('zooms in on %s', (_, eventInit) => {
    const { wrapper, image } = getWrapper()

    document.dispatchEvent(new KeyboardEvent('keydown', eventInit))

    expect(image.$scale).toHaveBeenCalledWith(1.1)
    wrapper.unmount()
  })
})

function getWrapper() {
  const selection = document.createElement('div')
  selection.tabIndex = 0
  document.body.appendChild(selection)
  selection.focus()

  const image = { $scale: vi.fn() }
  const wrapper = getComposableWrapper(() => {
    const { setCropperInstance } = useCropperKeyboardActions()
    setCropperInstance(
      ref(selection as unknown as CropperSelection),
      ref(image as unknown as CropperImage)
    )
  })

  return { wrapper, image }
}
