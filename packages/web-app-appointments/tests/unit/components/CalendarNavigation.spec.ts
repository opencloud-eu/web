import { createPinia, setActivePinia } from 'pinia'
import { defaultPlugins, mount } from '@opencloud-eu/web-test-helpers'
import CalendarNavigation from '../../../src/components/CalendarNavigation.vue'
import { useAppointmentsStore } from '../../../src/composables/piniaStores/appointments'

describe('CalendarNavigation', () => {
  it('renders backend calendar colors with a neutral token fallback and toggles selection', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const store = useAppointmentsStore()
    store.setCalendars([
      { id: 'personal', name: 'Personal', color: '#123456' },
      { id: 'team', name: 'Team' }
    ])

    const wrapper = mount(CalendarNavigation, {
      global: {
        plugins: [...defaultPlugins({ designSystem: false, pinia: false }), pinia],
        stubs: {
          OcButton: { template: '<button><slot /></button>' },
          OcIcon: true,
          OcSpinner: true,
          OcCheckbox: {
            props: ['modelValue', 'label'],
            emits: ['update:modelValue'],
            template:
              '<button :data-testid="`calendar-checkbox-${label}`" @click="$emit(\'update:modelValue\', !modelValue)" v-text="label" />'
          }
        }
      }
    })

    const personalIndicator = wrapper
      .get('[data-testid="calendar-navigation-item-personal"]')
      .get('span')
    const teamIndicator = wrapper.get('[data-testid="calendar-navigation-item-team"]').get('span')
    expect(personalIndicator.attributes('style')).toContain('background-color: #123456')
    expect(teamIndicator.attributes('style')).toContain('background-color: var(--oc-role-primary)')

    await wrapper.get('[data-testid="calendar-checkbox-Team"]').trigger('click')

    expect(store.selectedCalendarIds).toEqual(['personal'])
  })
})
