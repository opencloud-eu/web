import { mock } from 'vitest-mock-extended'
import ContextMenuQuickAction from '../../../../src/components/ContextActions/ContextMenuQuickAction.vue'
import { defaultPlugins, mount, PartialComponentProps } from '@opencloud-eu/web-test-helpers'
import { Resource } from '../../../../../web-client/src/helpers'

describe('ContextMenuQuickAction component', () => {
  it('renders component', () => {
    const { wrapper } = getWrapper()
    expect(wrapper.html()).toMatchSnapshot()
  })
  it('triggers the "quickActionClicked"-event on click', async () => {
    const { wrapper } = getWrapper()
    await wrapper.find('button').trigger('click')
    expect(wrapper.emitted('quickActionClicked')).toBeTruthy()
  })
})

function getWrapper({
  item = mock<Resource>({ id: '1' })
}: PartialComponentProps<typeof ContextMenuQuickAction> = {}) {
  return {
    wrapper: mount(ContextMenuQuickAction, {
      props: {
        item
      },
      global: {
        plugins: [...defaultPlugins()]
      }
    })
  }
}
