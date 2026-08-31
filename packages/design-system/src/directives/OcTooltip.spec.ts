import OcTooltip from './OcTooltip'
import type { DirectiveBinding } from 'vue'

describe('OcTooltip', () => {
  it('shares one document escape listener between visible tooltip instances', async () => {
    const addEventListener = vi.spyOn(document, 'addEventListener')
    const removeEventListener = vi.spyOn(document, 'removeEventListener')
    const first = document.createElement('button')
    const second = document.createElement('button')

    OcTooltip.beforeMount(first, { value: 'first' } as DirectiveBinding<string>)
    OcTooltip.beforeMount(second, { value: 'second' } as DirectiveBinding<string>)

    expect(addEventListener).not.toHaveBeenCalled()

    first.dispatchEvent(new Event('mouseenter'))
    second.dispatchEvent(new Event('mouseenter'))
    await vi.waitFor(() => expect(addEventListener).toHaveBeenCalledTimes(1))

    OcTooltip.unmounted(first)
    expect(removeEventListener).not.toHaveBeenCalled()

    OcTooltip.unmounted(second)
    expect(removeEventListener).toHaveBeenCalledTimes(1)
  })
})
