import { defaultComponentMocks, defaultPlugins, mount } from '@opencloud-eu/web-test-helpers'
import MonthView from '../../../src/components/MonthView.vue'
import { getMonthGridDays } from '../../../src/helpers/date'
import type { Appointment } from '../../../src/types'

describe('MonthView', () => {
  it('renders month navigation, days and appointments', () => {
    const { wrapper } = getWrapper({
      appointments: [
        appointment({ id: '1', title: 'Planning', start: '2026-06-25T08:00:00.000Z' })
      ],
      appointmentsByDay: {
        '2026-06-25': [
          appointment({ id: '1', title: 'Planning', start: '2026-06-25T08:00:00.000Z' })
        ]
      }
    })

    expect(wrapper.text()).toContain('June 2026')
    expect(wrapper.text()).toContain('Today')
    expect(wrapper.text()).toContain('Planning')
    expect(wrapper.get('[data-testid="calendar-day-2026-06-25"]').classes()).toContain(
      'calendar-month-day-today'
    )
  })

  it('emits navigation events', async () => {
    const { wrapper } = getWrapper()

    await wrapper.get('[data-testid="calendar-today-button"]').trigger('click')
    await wrapper.get('[data-testid="calendar-previous-button"]').trigger('click')
    await wrapper.get('[data-testid="calendar-next-button"]').trigger('click')

    expect(wrapper.emitted('today')).toBeTruthy()
    expect(wrapper.emitted('previous')).toBeTruthy()
    expect(wrapper.emitted('next')).toBeTruthy()
  })

  it('emits selected date when a day is clicked', async () => {
    const { wrapper } = getWrapper()

    await wrapper.get('[data-testid="calendar-day-2026-06-15"]').trigger('click')

    expect(wrapper.emitted('select-date')?.[0][0]).toEqual(new Date(2026, 5, 15))
  })

  it('renders loading and error states', () => {
    expect(
      getWrapper({ isLoading: true }).wrapper.findComponent({ name: 'AppLoadingSpinner' }).exists()
    ).toBeTruthy()

    const { wrapper } = getWrapper({ error: new Error('No connection') })
    expect(wrapper.get('[data-testid="calendar-month-error"]').text()).toContain(
      'Appointments could not be loaded'
    )
    expect(wrapper.text()).not.toContain('No connection')
  })
})

const getWrapper = (props: Partial<InstanceType<typeof MonthView>['$props']> = {}) => {
  const currentMonth = new Date(2026, 5, 1)
  const appointments = props.appointments || []

  return {
    wrapper: mount(MonthView, {
      props: {
        days: getMonthGridDays(currentMonth, new Date(2026, 5, 25)),
        currentMonth,
        appointments,
        appointmentsByDay: {},
        isLoading: false,
        error: null,
        ...props
      },
      global: {
        plugins: defaultPlugins({ designSystem: false, pinia: false }),
        mocks: {
          ...defaultComponentMocks(),
          $gettext: (message: string, vars?: Record<string, string | number>) => {
            if (!vars) {
              return message
            }

            return Object.entries(vars).reduce((result, [key, value]) => {
              return result.replace(`%{${key}}`, String(value))
            }, message)
          }
        },
        stubs: {
          AppLoadingSpinner: {
            name: 'AppLoadingSpinner',
            template: '<div data-testid="calendar-loading" />'
          }
        }
      }
    })
  }
}

const appointment = (overrides: Partial<Appointment>): Appointment => ({
  id: 'appointment',
  title: 'Planning',
  start: '2026-06-25T08:00:00.000Z',
  end: '2026-06-25T09:00:00.000Z',
  allDay: false,
  participants: [],
  ...overrides
})
