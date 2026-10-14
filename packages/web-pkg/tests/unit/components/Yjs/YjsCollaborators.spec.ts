import { defaultPlugins, mount } from '@opencloud-eu/web-test-helpers'
import YjsCollaborators from '../../../../src/components/Yjs/YjsCollaborators.vue'
import type { YjsCollaborator } from '../../../../src/composables/yjs'

const users: YjsCollaborator[] = [
  { id: 'me', name: 'Zoe', color: '#111111', isSelf: true },
  { id: 'p1', name: 'Alice', color: '#222222', isSelf: false },
  { id: 'p2', name: 'Bob', color: '#333333', isSelf: false },
  { id: 'p3', name: 'Carol', color: '#444444', isSelf: false },
  { id: 'p4', name: 'Dan', color: '#555555', isSelf: false }
]

function getWrapper(
  props: Partial<{
    users: YjsCollaborator[]
    followingSupported: boolean
    following: string | null
  }> = {}
) {
  const wrapper = mount(YjsCollaborators, {
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

describe('YjsCollaborators', () => {
  it('stacks at most three avatars and counts the rest', () => {
    const { wrapper } = getWrapper()
    const trigger = wrapper.find('.yjs-collaborators-trigger')
    expect(trigger.findAll('.yjs-collaborator-avatar')).toHaveLength(3)
    expect(trigger.find('.oc-avatar-count').text()).toBe('+2')
  })

  it('shows no counter when everyone fits', () => {
    const { wrapper } = getWrapper({ users: users.slice(0, 2) })
    expect(wrapper.findAll('.yjs-collaborator-avatar')).toHaveLength(2)
    expect(wrapper.find('.oc-avatar-count').exists()).toBe(false)
  })

  it('colors the avatar border and background with the user color', () => {
    const { wrapper } = getWrapper()
    const avatar = wrapper.find('.yjs-collaborator-avatar[data-test-user-id="p1"]')
    expect(avatar.attributes('style')).toContain('border-color: #222222')
    expect(avatar.find('.user-avatar-stub').attributes('data-bg')).toBe('#222222')
  })

  it('lists every user in the dropdown and marks the own user', () => {
    const { wrapper } = getWrapper()
    const items = wrapper.findAll('.yjs-collaborators-item')
    expect(items).toHaveLength(5)
    expect(items[0].text()).toContain('Zoe')
    expect(items[0].text()).toContain('(you)')
    expect(items[1].text()).not.toContain('(you)')
  })

  it('labels the trigger with the user count', () => {
    const { wrapper } = getWrapper()
    expect(wrapper.find('.yjs-collaborators-trigger').attributes('aria-label')).toBe(
      '5 people in this editing session'
    )
  })

  describe('following', () => {
    it('shows no follow controls unless the app opts in', () => {
      const { wrapper } = getWrapper({ following: 'p1' })
      expect(wrapper.find('.yjs-collaborators-follow-toggle').exists()).toBe(false)
      expect(wrapper.find('.yjs-collaborator-follow-badge').exists()).toBe(false)
      expect(wrapper.emitted('update:following')).toBeUndefined()
    })

    it('offers a follow toggle for everyone but the own user', () => {
      const { wrapper } = getWrapper({ followingSupported: true })
      const items = wrapper.findAll('.yjs-collaborators-item')
      expect(items[0].find('.yjs-collaborators-follow-toggle').exists()).toBe(false)
      expect(wrapper.findAll('.yjs-collaborators-follow-toggle')).toHaveLength(4)
      expect(items[1].find('.yjs-collaborators-follow-toggle').attributes('aria-label')).toBe(
        'Follow Alice'
      )
    })

    it('emits the user to follow and null to stop following', async () => {
      const { wrapper } = getWrapper({ followingSupported: true })
      await wrapper
        .find('[data-test-user-id="p2"] .yjs-collaborators-follow-toggle')
        .trigger('click')
      expect(wrapper.emitted('update:following')).toEqual([['p2']])

      await wrapper.setProps({ following: 'p2' })
      await wrapper
        .find('[data-test-user-id="p2"] .yjs-collaborators-follow-toggle')
        .trigger('click')
      expect(wrapper.emitted('update:following')).toEqual([['p2'], [null]])
    })

    it('highlights the followed user in the list and labels the trigger', () => {
      const { wrapper } = getWrapper({ followingSupported: true, following: 'p2' })
      const row = wrapper.find('.yjs-collaborators-item[data-test-user-id="p2"]')
      expect(row.classes()).toContain('yjs-collaborators-item-followed')
      expect(row.find('.yjs-collaborators-follow-toggle').attributes('aria-label')).toBe(
        'Stop following Bob'
      )
      expect(wrapper.find('.yjs-collaborators-trigger').attributes('aria-label')).toBe(
        'Following Bob. 5 people in this editing session'
      )
    })

    it('brings a followed user from the overflow into the avatar stack with a badge', () => {
      const { wrapper } = getWrapper({ followingSupported: true, following: 'p4' })
      const avatars = wrapper.find('.yjs-collaborators-trigger').findAll('.yjs-collaborator-avatar')
      expect(avatars.map((avatar) => avatar.attributes('data-test-user-id'))).toEqual([
        'me',
        'p4',
        'p1'
      ])
      expect(avatars[1].find('.yjs-collaborator-follow-badge').exists()).toBe(true)
    })

    it('never follows the own user', () => {
      const { wrapper } = getWrapper({ followingSupported: true, following: 'me' })
      expect(wrapper.find('.yjs-collaborator-follow-badge').exists()).toBe(false)
      expect(wrapper.emitted('update:following')).toEqual([[null]])
    })

    it('stops following when the followed user leaves the session', async () => {
      const { wrapper } = getWrapper({ followingSupported: true, following: 'p3' })
      expect(wrapper.emitted('update:following')).toBeUndefined()

      await wrapper.setProps({ users: users.filter((user) => user.id !== 'p3') })
      expect(wrapper.emitted('update:following')).toEqual([[null]])
    })
  })
})
