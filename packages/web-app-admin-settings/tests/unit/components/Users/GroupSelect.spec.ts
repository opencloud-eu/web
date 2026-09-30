import { nextTick } from 'vue'
import GroupSelect from '../../../../src/components/Users/GroupSelect.vue'
import { defaultPlugins, shallowMount } from '@opencloud-eu/web-test-helpers'
import { mock } from 'vitest-mock-extended'
import { Group } from '@opencloud-eu/web-client/graph/generated'
import { OcSelect } from '@opencloud-eu/design-system/components'

const groupMock = mock<Group>({ id: '1', groupTypes: [] })

describe('GroupSelect', () => {
  it('renders a multi select input with the selected groups', () => {
    const { wrapper } = getWrapper()
    const select = wrapper.findComponent(OcSelect)
    expect(select.props('label')).toBe('Groups')
    expect(select.props('multiple')).toBeTruthy()
    const vueSelect = getVueSelect(wrapper)
    const [selectedGroup] = vueSelect.props('modelValue')
    expect(selectedGroup.id).toBe(groupMock.id)
    expect(selectedGroup.readonly).toBeFalsy()
  })
  it('correctly maps the read-only state', () => {
    const groupMock = mock<Group>({ id: '1', groupTypes: ['ReadOnly'] })
    const { wrapper } = getWrapper(groupMock)
    const vueSelect = getVueSelect(wrapper)
    expect(vueSelect.props('modelValue')[0].readonly).toBeTruthy()
  })
  it('selects nothing if the groups have not been loaded yet', () => {
    const { wrapper } = getWrapper(groupMock, { selectedGroups: undefined })
    const vueSelect = getVueSelect(wrapper)
    expect(vueSelect.props('modelValue')).toEqual([])
  })
  it('emits "selectedOptionChange" on update', async () => {
    const group = mock<Group>({ id: '2', groupTypes: [] })
    const { wrapper } = getWrapper()
    const vueSelect = getVueSelect(wrapper)

    vueSelect.vm.$emit('update:modelValue', group)
    expect(wrapper.emitted().selectedOptionChange).toBeTruthy()
    await nextTick()
    expect(vueSelect.props('modelValue')).toEqual(group)
  })
})

function getVueSelect(wrapper: ReturnType<typeof getWrapper>['wrapper']) {
  return wrapper.findComponent(OcSelect).findComponent({ ref: 'selectRef' }) as any
}

function getWrapper(group = groupMock, propsOverride: { selectedGroups?: Group[] } = {}) {
  return {
    wrapper: shallowMount(GroupSelect, {
      props: {
        selectedGroups: [group],
        groupOptions: [group],
        ...propsOverride
      },
      global: {
        plugins: [...defaultPlugins()],
        stubs: { OcSelect: false }
      }
    })
  }
}
