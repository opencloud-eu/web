import { defaultPlugins, mount } from '@opencloud-eu/web-test-helpers'
import AppointmentDetailsModal from '../../../src/components/AppointmentDetailsModal.vue'
import { createAppointmentOccurrences } from '../../../src/helpers/date'
import type { Appointment } from '../../../src/types'

describe('AppointmentDetailsModal', () => {
  it('renders read-only appointment metadata from the backend model', () => {
    const [occurrence] = createAppointmentOccurrences([
      appointment({
        title: 'Quarterly planning',
        location: 'OpenCloud Office',
        description: 'Review the next quarter.',
        timeZone: 'Europe/Berlin',
        privacy: 'private',
        status: 'confirmed',
        hasRecurrence: true,
        hasReminder: true,
        participants: [{ id: 'participant-1', name: 'Ada', status: 'accepted' }]
      })
    ])
    const wrapper = mount(AppointmentDetailsModal, {
      props: {
        occurrence,
        calendar: { id: 'personal', name: 'Personal', color: '#123456' }
      },
      global: {
        plugins: defaultPlugins({ designSystem: false, pinia: false }),
        stubs: {
          OcModal: {
            name: 'OcModal',
            props: ['title'],
            emits: ['cancel'],
            template:
              '<section data-testid="appointment-details-modal"><h2 v-text="title" /><slot name="content" /></section>'
          }
        }
      }
    })

    expect(wrapper.text()).toContain('Quarterly planning')
    expect(wrapper.text()).toContain('Personal')
    expect(wrapper.text()).toContain('OpenCloud Office')
    expect(wrapper.text()).toContain('Review the next quarter.')
    expect(wrapper.text()).toContain('Ada (Accepted)')
    expect(wrapper.text()).toContain('Private')
    expect(wrapper.text()).toContain('Recurring appointment')
    expect(wrapper.text()).toContain('Reminder configured')
    expect(wrapper.find('input').exists()).toBeFalsy()
    expect(wrapper.find('textarea').exists()).toBeFalsy()
  })

  it('emits close when the ODS modal is cancelled', async () => {
    const [occurrence] = createAppointmentOccurrences([appointment({})])
    const wrapper = mount(AppointmentDetailsModal, {
      props: { occurrence },
      global: {
        plugins: defaultPlugins({ designSystem: false, pinia: false }),
        stubs: {
          OcModal: {
            name: 'OcModal',
            props: ['title'],
            emits: ['cancel'],
            template: '<div />'
          }
        }
      }
    })

    wrapper.findComponent({ name: 'OcModal' }).vm.$emit('cancel')
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('close')).toBeTruthy()
  })
})

function appointment(overrides: Partial<Appointment>): Appointment {
  return {
    id: 'appointment',
    calendarId: 'personal',
    title: 'Planning',
    start: '2026-06-25T08:00:00.000Z',
    end: '2026-06-25T09:00:00.000Z',
    allDay: false,
    participants: [],
    recurrenceRules: [],
    hasRecurrence: false,
    hasReminder: false,
    excluded: false,
    ...overrides
  }
}
