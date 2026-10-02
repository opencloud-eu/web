import { createPinia, setActivePinia } from 'pinia'
import { defaultComponentMocks, defaultPlugins, mount } from '@opencloud-eu/web-test-helpers'
import CalendarNavigation from '../../../src/components/CalendarNavigation.vue'
import { useAppointmentsStore } from '../../../src/composables/piniaStores/appointments'

describe('CalendarNavigation', () => {
  it('renders a color indicator only for calendars that carry a color', () => {
    const { wrapper } = getWrapper()

    expect(
      wrapper.get('[data-testid="calendar-navigation-item-personal"] span').attributes('style')
    ).toContain('background-color: #123456')
    // The Groupware API does not send a color for every calendar; an indicator without a color
    // would be indistinguishable from the checkbox next to it.
    expect(
      wrapper
        .find('[data-testid="calendar-navigation-item-team"] span[aria-hidden="true"]')
        .exists()
    ).toBeFalsy()
  })

  it('keeps long calendar names on one line and exposes them as a tooltip', () => {
    const { wrapper } = getWrapper()
    const checkbox = wrapper.get('[data-testid="calendar-navigation-item-personal"] .oc-checkbox')
    const label = checkbox.element.parentElement

    expect(label?.getAttribute('title')).toBe('Personal')
    expect(label?.className).toContain('truncate')
  })

  it('toggles the calendar selection', async () => {
    const { wrapper, store } = getWrapper()

    await wrapper
      .get('[data-testid="calendar-navigation-item-team"]')
      .get('input[type="checkbox"]')
      .setValue(false)

    expect(store.selectedCalendarIds).toEqual(['personal'])
  })

  it('renders localized weekday initials', () => {
    const { wrapper } = getWrapper()
    const weekdays = wrapper.findAll('.calendar-mini-month .grid-cols-7 > span')

    expect(weekdays.map((weekday) => weekday.attributes('aria-label'))).toEqual([
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
      'Sunday'
    ])
  })

  it('renders an empty state when the account has no calendars', () => {
    const { wrapper } = getWrapper({ calendars: [] })

    expect(wrapper.text()).toContain('No calendars found')
  })
})

const getWrapper = ({
  calendars = [
    { id: 'personal', name: 'Personal', color: '#123456' },
    { id: 'team', name: 'Team' }
  ]
} = {}) => {
  const pinia = createPinia()
  setActivePinia(pinia)
  const store = useAppointmentsStore()
  store.setCalendars(calendars)
  const componentMocks = defaultComponentMocks()

  return {
    store,
    wrapper: mount(CalendarNavigation, {
      global: {
        plugins: [...defaultPlugins({ pinia: false }), pinia],
        mocks: componentMocks,
        provide: componentMocks
      }
    })
  }
}
