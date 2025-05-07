import ActivitiesPanel from '../../../../src/components/SideBar/ActivitiesPanel.vue'
import { defaultComponentMocks, defaultPlugins, mount } from '@opencloud-eu/web-test-helpers'
import { Resource } from '@opencloud-eu/web-client'
import { mock } from 'vitest-mock-extended'
import { flushPromises } from '@vue/test-utils'

const defaultActivities = [
  {
    id: '5380e156-d65e-4024-9691-0f0c1f2796e4',
    times: {
      recordedTime: '2024-07-29T18:34:40Z'
    },
    template: {
      message: '{user} created {resource}.',
      variables: {
        user: {
          id: '71f9de60-8b24-4cfe-9378-87d47aef0d04',
          displayName: 'Marie Curie'
        },
        resource: {
          id: '7f92b0a9-06ad-49dc-890f-0e0a6eb4dea6$e9f01ca3-577f-4d1d-acd4-1cc44149ac25!5fb9f87c-a317-467b-9882-eb9f171564ac',
          name: 'new folder'
        }
      }
    }
  },
  {
    id: '5380e156-d65e-4024-9691-0f0c1f2796e4',
    times: {
      recordedTime: '2023-07-29T18:34:40Z'
    },
    template: {
      message: '{user} moved {resource}.',
      variables: {
        user: {
          id: '71f9de60-8b24-4cfe-9378-87d47aef0d04',
          displayName: 'Albert Einstein'
        },
        resource: {
          id: '7f92b0a9-06ad-49dc-890f-0e0a6eb4dea6$e9f01ca3-577f-4d1d-acd4-1cc44149ac25!5fb9f87c-a317-467b-9882-eb9f171564ac',
          name: 'textfile.txt'
        }
      }
    }
  },
  {
    id: '5380e156-d65e-4024-9691-0f0c1f2796e4',
    times: {
      recordedTime: '2022-07-29T18:34:40Z'
    },
    template: {
      message: '{user} deleted {resource}.',
      variables: {
        user: {
          id: '71f9de60-8b24-4cfe-9378-87d47aef0d04',
          displayName: 'Robert Oppenheimer'
        },
        resource: {
          id: '7f92b0a9-06ad-49dc-890f-0e0a6eb4dea6$e9f01ca3-577f-4d1d-acd4-1cc44149ac25!5fb9f87c-a317-467b-9882-eb9f171564ac',
          name: 'atom plans.pdf'
        }
      }
    }
  },
  {
    id: '5380e156-d65e-4024-9691-0f0c1f2796e4',
    times: {
      recordedTime: '2021-07-29T18:34:40Z'
    },
    template: {
      message: '{user} removed {resource}.',
      variables: {
        user: {
          id: '71f9de60-8b24-4cfe-9378-87d47aef0d04',
          displayName: 'Albert Schweitzer'
        },
        resource: {
          id: '7f92b0a9-06ad-49dc-890f-0e0a6eb4dea6$e9f01ca3-577f-4d1d-acd4-1cc44149ac25!5fb9f87c-a317-467b-9882-eb9f171564ac',
          name: 'Selfie.png'
        }
      }
    }
  }
]
describe('ActivitiesPanel', () => {
  it('should show no activities message if there is no data', async () => {
    const { wrapper } = getMountedWrapper({ activities: [] })
    await flushPromises()
    expect(wrapper.html()).toContain('No activities')
  })
  it('should show loading spinner when fetching data', () => {
    const { wrapper } = getMountedWrapper()
    expect(wrapper.find('.oc-loader').exists()).toBeTruthy()
  })
  it('should render a list of activities when data is present', async () => {
    const { wrapper } = getMountedWrapper()
    await flushPromises()
    expect(wrapper.html()).toMatchSnapshot()
  })
})

function getMountedWrapper({
  activities = defaultActivities
}: {
  activities?: any[]
  isActive?: boolean
} = {}) {
  const mocks = {
    ...defaultComponentMocks()
  }
  mocks.$clientService.graphAuthenticated.activities.listActivities.mockResolvedValue(activities)

  return {
    wrapper: mount(ActivitiesPanel, {
      global: {
        mocks,
        plugins: [...defaultPlugins()],
        provide: { ...mocks, resource: mock<Resource> }
      }
    }),
    mocks
  }
}
