import { mock } from 'vitest-mock-extended'
import { defineComponent, h, nextTick, ref } from 'vue'
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
  it('exposes a usable "drop" handle when captured via a render-time function ref', async () => {
    // mirrors how consumers (e.g. ResourceTable) capture the drop:
    // `:ref="(el) => (contextMenuDrops[item.id] = el?.drop)"`
    const captured = ref<any>(null)
    const item = mock<Resource>({ id: '1' })

    const Parent = defineComponent({
      setup() {
        return () =>
          h(ContextMenuQuickAction, {
            item,
            ref: (el: any) => (captured.value = el?.drop)
          })
      }
    })

    mount(Parent, { global: { plugins: [...defaultPlugins()] } })
    await nextTick()
    await nextTick()

    // before the fix this stayed `null` on vue >= 3.5.39 (function-ref tracking paused),
    // so the context menu never opened on the first click.
    expect(captured.value).toBeTruthy()
    expect(typeof captured.value.show).toBe('function')
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
