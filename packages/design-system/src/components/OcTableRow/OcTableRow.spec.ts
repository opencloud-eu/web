import { mount, defaultPlugins } from '@opencloud-eu/web-test-helpers'
import OcTableRow from './OcTableRow.vue'

const fields = [
  { name: 'id', title: 'Id' },
  { name: 'resource', title: 'Resource', type: 'slot' },
  {
    name: 'doubled',
    title: 'Doubled',
    type: 'callback',
    callback: (value: number) => `Double of ${value} is ${value * 2}`
  }
]

const item = {
  id: '4b136c0a-5057-11eb-ac70-eba264112003',
  resource: 'hello-world.txt',
  doubled: 2
}

function getWrapper(props = {}, slots = {}) {
  return mount(OcTableRow, {
    props: {
      item,
      fields,
      domSelector: item.id,
      isHighlighted: () => false,
      isDisabled: () => false,
      ...props
    },
    slots: {
      resource: `<div class="slot">Hello world!</div>`,
      ...slots
    },
    global: { plugins: defaultPlugins() }
  })
}

describe('OcTableRow', () => {
  it('renders slot, callback and plain cells', () => {
    const wrapper = getWrapper()
    expect(wrapper.find('.slot').exists()).toBeTruthy()
    expect(wrapper.html()).toContain(item.id)
    expect(wrapper.html()).toContain('Double of 2 is 4')
  })

  it('sets data-item-id and the dom-selector class', () => {
    const wrapper = getWrapper()
    expect(wrapper.attributes('data-item-id')).toBe(item.id)
    expect(wrapper.find(`.oc-tbody-tr-${item.id}`).exists()).toBeTruthy()
  })

  it('highlights the row based on the isHighlighted resolver', () => {
    expect(
      getWrapper({ isHighlighted: () => true })
        .find('.oc-table-highlighted')
        .exists()
    ).toBe(true)
    expect(
      getWrapper({ isHighlighted: () => false })
        .find('.oc-table-highlighted')
        .exists()
    ).toBe(false)
  })

  it('disables the row based on the isDisabled resolver', () => {
    const wrapper = getWrapper({ isDisabled: () => true })
    expect(wrapper.find('.oc-table-disabled').exists()).toBeTruthy()
  })

  it('makes the row draggable when dragDrop is enabled', () => {
    expect(getWrapper({ dragDrop: true }).attributes('draggable')).toBe('true')
  })

  it('exposes highlighted to field slots', () => {
    const wrapper = getWrapper(
      { isHighlighted: () => true },
      {
        resource: `<template #resource="{ highlighted }">
          <span class="slot" :data-highlighted="highlighted" />
        </template>`
      }
    )
    const slot = wrapper.find('.slot')
    expect(slot.attributes('data-highlighted')).toBe('true')
  })

  it('emits click and contextmenu events', async () => {
    const wrapper = getWrapper()
    await wrapper.trigger('click')
    await wrapper.trigger('contextmenu')
    expect(wrapper.emitted('click')).toHaveLength(1)
    expect(wrapper.emitted('contextmenu')).toHaveLength(1)
  })
})
