import CompareSaveDialog from '../../../../src/components/SideBar/CompareSaveDialog.vue'
import { defaultPlugins, shallowMount } from '@opencloud-eu/web-test-helpers'
import { OcHiddenAnnouncer } from '@opencloud-eu/design-system/components'

describe('CompareSaveDialog', () => {
  describe('computed method "unsavedChanges"', () => {
    it('should be false if objects are equal', () => {
      const { wrapper } = getWrapper({
        propsData: {
          originalObject: { id: '1', displayName: 'jan' },
          compareObject: { id: '1', displayName: 'jan' }
        }
      })
      expect((wrapper.vm as any).unsavedChanges).toBeFalsy()
    })

    it('should be true if objects are not equal', () => {
      const { wrapper } = getWrapper({
        propsData: {
          originalObject: { id: '1', displayName: 'jan' },
          compareObject: { id: '1', displayName: 'janina' }
        }
      })
      expect((wrapper.vm as any).unsavedChanges).toBeTruthy()
    })
  })
  describe('saved state', () => {
    it.each([
      { saved: true, compareObject: { id: '1', displayName: 'jan' }, showsSaved: true },
      { saved: true, compareObject: { id: '1', displayName: 'janina' }, showsSaved: false },
      { saved: false, compareObject: { id: '1', displayName: 'jan' }, showsSaved: false }
    ])(
      'shows "Changes saved": $showsSaved (saved: $saved, compareObject: $compareObject)',
      ({ saved, compareObject, showsSaved }) => {
        const { wrapper } = getWrapper({
          propsData: { originalObject: { id: '1', displayName: 'jan' }, compareObject, saved }
        })
        expect(wrapper.text().includes('Changes saved')).toBe(showsSaved)
      }
    )
    it.each([
      { compareObject: { id: '1', displayName: 'jan' }, announcement: 'Changes saved' },
      { compareObject: { id: '1', displayName: 'janina' }, announcement: '' }
    ])(
      'announces "$announcement" after saving (compareObject: $compareObject)',
      async ({ compareObject, announcement }) => {
        const { wrapper } = getWrapper({
          propsData: { originalObject: { id: '1', displayName: 'jan' }, compareObject }
        })
        const announcer = wrapper.findComponent(OcHiddenAnnouncer)
        expect(announcer.props('announcement')).toBe('')
        await wrapper.setProps({ saved: true })
        expect(announcer.props('announcement')).toBe(announcement)
      }
    )
    it('clears the announcement when the saved state gets reset', async () => {
      const { wrapper } = getWrapper({
        propsData: {
          originalObject: { id: '1', displayName: 'jan' },
          compareObject: { id: '1', displayName: 'jan' },
          saved: true
        }
      })
      await wrapper.setProps({ saved: false })
      expect(wrapper.findComponent(OcHiddenAnnouncer).props('announcement')).toBe('')
    })
    it('resets the saved state after a timeout', async () => {
      vi.useFakeTimers()
      const { wrapper } = getWrapper({
        propsData: {
          originalObject: { id: '1', displayName: 'jan' },
          compareObject: { id: '1', displayName: 'jan' }
        }
      })
      await wrapper.setProps({ saved: true })
      expect(wrapper.emitted('update:saved')).toBeUndefined()
      vi.runAllTimers()
      expect(wrapper.emitted('update:saved')).toEqual([[false]])
      vi.useRealTimers()
    })
  })
})

function getWrapper({ propsData = {} } = {}) {
  return {
    wrapper: shallowMount(CompareSaveDialog, {
      props: {
        originalObject: {},
        compareObject: {},
        ...propsData
      },
      global: {
        plugins: [...defaultPlugins()]
      }
    })
  }
}
