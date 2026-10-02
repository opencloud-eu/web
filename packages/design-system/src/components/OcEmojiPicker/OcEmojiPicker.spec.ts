import { defaultPlugins, mount } from '@opencloud-eu/web-test-helpers'
import OcEmojiPicker from './OcEmojiPicker.vue'

const { pickerSpy } = vi.hoisted(() => ({ pickerSpy: vi.fn() }))

vi.mock('@emoji-mart/data', () => ({ default: {} }))
vi.mock('emoji-mart', () => ({
  Picker: class {
    constructor(options: unknown) {
      pickerSpy(options)
      return document.createElement('div')
    }
  }
}))

describe('OcEmojiPicker', () => {
  beforeEach(() => {
    pickerSpy.mockClear()
  })

  it('recreates the picker when the language changes', async () => {
    const wrapper = mount(OcEmojiPicker, { global: { plugins: [...defaultPlugins()] } })
    await vi.waitFor(() => expect(pickerSpy).toHaveBeenCalledTimes(1))

    wrapper.vm.$language.current = 'de'

    await vi.waitFor(() => expect(pickerSpy).toHaveBeenCalledTimes(2))
  })
})
