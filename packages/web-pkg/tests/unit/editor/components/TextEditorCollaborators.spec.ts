import { defaultPlugins, mount } from '@opencloud-eu/web-test-helpers'
import TextEditorCollaborators from '../../../../src/editor/components/TextEditorCollaborators.vue'
import type { YjsCollaborator } from '../../../../src/composables/yjs'

const users: YjsCollaborator[] = [
  { id: 'me', name: 'Zoe', color: '#111111', isSelf: true },
  { id: 'p1', name: 'Alice', color: '#222222', isSelf: false },
  { id: 'p2', name: 'Bob', color: '#333333', isSelf: false },
  { id: 'p3', name: 'Carol', color: '#444444', isSelf: false },
  { id: 'p4', name: 'Dan', color: '#555555', isSelf: false }
]

function getWrapper(props: Partial<{ users: YjsCollaborator[]; maxDisplayed: number }> = {}) {
  const wrapper = mount(TextEditorCollaborators, {
    props: { users, ...props },
    global: {
      plugins: [...defaultPlugins()],
      stubs: {
        UserAvatar: {
          props: ['userId', 'userName', 'width', 'backgroundColor'],
          template: '<span class="user-avatar-stub" :data-bg="backgroundColor" />'
        },
        OcDrop: { template: '<div class="oc-drop-stub"><slot /></div>' }
      }
    }
  })
  return { wrapper }
}

describe('TextEditorCollaborators', () => {
  it('stacks at most three avatars and counts the rest', () => {
    const { wrapper } = getWrapper()
    const trigger = wrapper.find('.text-editor-toolbar-collaborators-trigger')
    expect(trigger.findAll('.text-editor-collaborator-avatar')).toHaveLength(3)
    expect(trigger.find('.oc-avatar-count').text()).toBe('+2')
  })

  it('shows no counter when everyone fits', () => {
    const { wrapper } = getWrapper({ users: users.slice(0, 2) })
    expect(wrapper.findAll('.text-editor-collaborator-avatar')).toHaveLength(2)
    expect(wrapper.find('.oc-avatar-count').exists()).toBe(false)
  })

  it('colors the avatar border and background with the user color', () => {
    const { wrapper } = getWrapper()
    const avatar = wrapper.find('.text-editor-collaborator-avatar[data-test-user-id="p1"]')
    expect(avatar.attributes('style')).toContain('border-color: #222222')
    expect(avatar.find('.user-avatar-stub').attributes('data-bg')).toBe('#222222')
  })

  it('lists every user in the dropdown and marks the own user', () => {
    const { wrapper } = getWrapper()
    const items = wrapper.findAll('.text-editor-collaborators-item')
    expect(items).toHaveLength(5)
    expect(items[0].text()).toContain('Zoe')
    expect(items[0].text()).toContain('(you)')
    expect(items[1].text()).not.toContain('(you)')
  })

  it('labels the trigger with the user count', () => {
    const { wrapper } = getWrapper()
    expect(
      wrapper.find('.text-editor-toolbar-collaborators-trigger').attributes('aria-label')
    ).toBe('5 people in this editing session')
  })
})
