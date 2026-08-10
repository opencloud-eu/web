import { DOMWrapper } from '@vue/test-utils'
import SkipTo from '../../../src/components/SkipTo.vue'
import { shallowMount } from '@opencloud-eu/web-test-helpers'

const selectors = {
  skipButton: '.skip-button'
}

describe('SkipTo component', () => {
  const el = document.createElement('div')
  vi.spyOn(document, 'getElementById').mockReturnValue(el)

  let wrapper: ReturnType<typeof getShallowWrapper>['wrapper']
  let skipButton: DOMWrapper<Element>
  beforeEach(() => {
    wrapper = getShallowWrapper().wrapper
    skipButton = wrapper.find(selectors.skipButton)
  })

  it('should render provided text in the slot', () => {
    expect(skipButton.text()).toEqual('Skip to main')
  })
  it('should call "skipToTarget" method on click', async () => {
    await skipButton.trigger('click')
    expect(document.getElementById).toHaveBeenCalled()
  })
})

function getShallowWrapper() {
  return {
    wrapper: shallowMount(SkipTo, {
      props: {
        target: ''
      },
      slots: {
        default: 'Skip to main'
      }
    })
  }
}
