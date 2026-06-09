import ActivitiesPanel from '../../../../src/components/SideBar/ActivitiesPanel.vue'
import { defaultComponentMocks, defaultPlugins, mount } from '@opencloud-eu/web-test-helpers'
import { Resource, SpaceResource } from '@opencloud-eu/web-client'
import { mock } from 'vitest-mock-extended'
import { flushPromises } from '@vue/test-utils'
import { Activity } from '@opencloud-eu/web-client/graph/generated'
import { getVaultClaim, resolveFolderVault } from '@opencloud-eu/web-pkg'

vi.mock('@opencloud-eu/web-pkg', async (importOriginal) => ({
  ...(await importOriginal<any>()),
  resolveFolderVault: vi.fn(),
  getVaultClaim: vi.fn(),
  useGetMatchingSpace: () => ({ getMatchingSpace: () => mock<SpaceResource>() })
}))

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
  it('decrypts vault resource names in the feed and leaves user names untouched', async () => {
    const engine = {
      vaultRoot: '/my.vault',
      decryptPath: vi.fn((segment: string) => Promise.resolve(`DEC(${segment})`))
    }
    vi.mocked(getVaultClaim).mockReturnValue({ vaultRoot: '/v', encryptsNames: true } as any)
    vi.mocked(resolveFolderVault).mockResolvedValueOnce(engine as any)

    const activities = [
      {
        id: '1',
        times: { recordedTime: '2024-07-29T18:34:40Z' },
        template: {
          message: '{user} created {resource}.',
          variables: {
            user: { id: 'u1', displayName: 'Marie Curie' },
            resource: { id: 'r1', name: 'encryptedblob' }
          }
        }
      }
    ] as unknown as Activity[]

    const { wrapper } = getMountedWrapper({ activities })
    await flushPromises()

    // resource name is decrypted, the user (people) name is rendered untouched
    expect(engine.decryptPath).toHaveBeenCalledWith('encryptedblob')
    expect(wrapper.html()).toContain('DEC(encryptedblob)')
    expect(wrapper.html()).toContain('Marie Curie')
  })

  it('does not resolve the engine or decrypt for a content-only scheme', async () => {
    // encryptsNames=false -> names are clear text on the server, nothing to do.
    vi.mocked(resolveFolderVault).mockClear()
    vi.mocked(getVaultClaim).mockReturnValue({ vaultRoot: '/v', encryptsNames: false } as any)

    const activities = [
      {
        id: '1',
        times: { recordedTime: '2024-07-29T18:34:40Z' },
        template: {
          message: '{user} created {resource}.',
          variables: {
            user: { id: 'u1', displayName: 'Marie Curie' },
            resource: { id: 'r1', name: 'cleartext-name.txt' }
          }
        }
      }
    ] as unknown as Activity[]

    const { wrapper } = getMountedWrapper({ activities })
    await flushPromises()

    expect(resolveFolderVault).not.toHaveBeenCalled()
    expect(wrapper.html()).toContain('cleartext-name.txt')
  })
})

function getMountedWrapper({
  activities = defaultActivities
}: {
  activities?: Activity[]
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
