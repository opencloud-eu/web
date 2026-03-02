import { nextTick } from 'vue'
import GroupSelect from '../../../../src/components/Users/GroupSelect.vue'
import { defaultPlugins, shallowMount } from '@opencloud-eu/web-test-helpers'
import { mock } from 'vitest-mock-extended'
import { Group } from '@opencloud-eu/web-client/graph/generated'

const groupMock = mock<Group>({ id: '1', groupTypes: [] })

describe('GroupSelect', () => {
  it('renders the select input', () => {
    const { wrapper } = getWrapper()
    expect(wrapper.html()).toMatchSnapshot()
  })
  it('correctly maps the read-only state', () => {
    const groupMock = mock<Group>({ id: '1', groupTypes: ['ReadOnly'] })
    const { wrapper } = getWrapper(groupMock)
    const vueSelect = wrapper.findComponent('vue-select-stub') as any
    expect(vueSelect.props('modelValue')[0].readonly).toBeTruthy()
  })
  it('emits "selectedOptionChange" on update', async () => {
    const group = mock<Group>({ id: '2', groupTypes: [] })
    const { wrapper } = getWrapper()
    const vueSelect = wrapper.findComponent('vue-select-stub') as any

    vueSelect.vm.$emit('update:modelValue', group)
    expect(wrapper.emitted().selectedOptionChange).toBeTruthy()
    await nextTick()
    expect(vueSelect.props('modelValue')).toEqual(group)
  })
})

function getWrapper(group = groupMock) {
  return {
    wrapper: shallowMount(GroupSelect, {
      props: {
        selectedGroups: [group],
        groupOptions: [group]
      },
      global: {
        plugins: [...defaultPlugins()],
        stubs: { OcSelect: false }
      }
    })
  }
}
