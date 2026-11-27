import { mock } from 'vitest-mock-extended'
import { SpaceResource } from '@opencloud-eu/web-client'
import { FileAction } from '@opencloud-eu/web-pkg'
import { defaultPlugins, mount, PartialComponentProps } from '@opencloud-eu/web-test-helpers'
import QuickCreateItem from '../../../../../src/components/AppBar/QuickCreate/QuickCreateItem.vue'

describe('QuickCreateItem', () => {
  it('calls the action handler with the space on click', async () => {
    const space = mock<SpaceResource>()
    const action = getAction()
    const { wrapper } = getWrapper({ action, space })
    await wrapper.find('button').trigger('click')
    expect(action.handler).toHaveBeenCalledWith({ space })
  })

  it('renders a link for actions with an href and no handler', async () => {
    const action = getAction({ handler: undefined, href: () => 'https://example.org' })
    const { wrapper } = getWrapper({ action })
    expect(wrapper.find('a').attributes('href')).toBe('https://example.org')
    await wrapper.find('a').trigger('click')
  })

  it('shows the label', () => {
    const { wrapper } = getWrapper()
    expect(wrapper.text()).toContain('Note')
  })

  it('shows the description if given', () => {
    const { wrapper } = getWrapper({ action: getAction({ description: () => 'Write together' }) })
    expect(wrapper.find('.quick-create-item-description').text()).toBe('Write together')
  })

  it('omits the description if not given', () => {
    const { wrapper } = getWrapper({ action: getAction({ description: undefined }) })
    expect(wrapper.find('.quick-create-item-description').exists()).toBe(false)
  })

  it('hides the label and sets an aria label in icon only mode', () => {
    const { wrapper } = getWrapper({ iconOnly: true })
    const text = wrapper.find('.quick-create-item-text')
    expect(text.classes()).toContain('invisible')
    expect(text.attributes('aria-hidden')).toBe('true')
    expect(wrapper.find('button').attributes('aria-label')).toBe('Note')
  })

  it('keeps the label and description in the layout in icon only mode', () => {
    const { wrapper } = getWrapper({
      iconOnly: true,
      action: getAction({ description: () => 'Write together' })
    })
    expect(wrapper.find('.quick-create-item-text').text()).toContain('Note')
    expect(wrapper.find('.quick-create-item-description').exists()).toBe(true)
  })

  it('centers the icons in icon only mode', () => {
    const { wrapper } = getWrapper({ iconOnly: true })
    expect(wrapper.find('button').classes()).toContain('justify-center')
  })

  it('disables the button if the action is disabled', () => {
    const { wrapper } = getWrapper({ action: getAction({ isDisabled: () => true }) })
    expect(wrapper.find('button').attributes('disabled')).toBeDefined()
  })
})

function getAction(opts: Partial<FileAction> = {}) {
  return mock<FileAction>({
    name: 'create-new-file',
    ext: 'ocnote',
    icon: 'add',
    class: 'oc-files-actions-create-new-file',
    label: () => 'Note',
    isDisabled: () => false,
    handler: vi.fn(),
    ...opts
  })
}

function getWrapper({
  action = getAction(),
  space = mock<SpaceResource>(),
  iconOnly = false
}: Partial<PartialComponentProps<typeof QuickCreateItem>> = {}) {
  return {
    wrapper: mount(QuickCreateItem, {
      props: { action, space, iconOnly },
      global: { plugins: [...defaultPlugins()], stubs: { ResourceIcon: true } }
    })
  }
}
