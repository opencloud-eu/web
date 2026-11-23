import { Before, After, AfterAll } from './fixtures'
import { appConfig } from '../playwright.config'
import { api, environment, utils, store } from '../support'
import { v4 as uuidv4 } from 'uuid'
import { Group, User } from '../support/types'
import { World } from './world'

Before(async ({ world }) => {
  if (!appConfig.basicAuth) {
    const adminUser = world.usersEnvironment.getUser({ key: 'admin' })

    if (appConfig.keycloak) {
      await api.keycloak.setAccessTokenForKeycloakOpenCloudUser(adminUser)
      await api.keycloak.setKeycloakAdminAccessToken()
    } else {
      await api.token.setAccessAndRefreshToken(adminUser)
      if (isOcm(world)) {
        appConfig.federatedServer = true
        // need to set tokens for federated OpenCloud admin
        await api.token.setAccessAndRefreshToken(adminUser)
        appConfig.federatedServer = false
      }
    }
  }

  world.uniquePrefix = uuidv4().substring(0, 8)
  world.a11yEnabled = world.tags?.includes('@a11y') ?? false
})

// every cleanup step runs even if an earlier one failed, the failures are reported at the end
After(async ({ world }) => {
  appConfig.federatedServer = false
  const adminUser = world.usersEnvironment.getUser({ key: 'admin' })
  const errors: unknown[] = []

  await runCleanup(errors, () => world.actorsEnvironment.close())

  // refresh keycloak admin access token
  if (appConfig.keycloak) {
    await runCleanup(errors, async () => {
      await api.keycloak.refreshKeycloakAdminAccessToken()
      await api.keycloak.refreshAccessTokenForKeycloakOpenCloudUser(adminUser)
    })
  }

  if (isOcm(world)) {
    appConfig.federatedServer = true
    await runCleanup(errors, () => cleanUpUser(store.federatedUserStore, adminUser))
    appConfig.federatedServer = false
  }

  await runCleanup(errors, () => cleanUpUser(store.createdUserStore, adminUser))
  await runCleanup(errors, () => cleanUpGuests(adminUser))
  await runCleanup(errors, () => cleanUpSpaces(adminUser))
  await runCleanup(errors, () => cleanUpGroup(adminUser))

  store.createdLinkStore.clear()
  store.createdTokenStore.clear()
  store.federatedTokenStore.clear()
  store.keycloakTokenStore.clear()
  utils.removeTempUploadDirectory()
  environment.closeSSEConnections()

  if (errors.length) {
    throw new AggregateError(errors, `${errors.length} cleanup step(s) failed after the scenario`)
  }
})

AfterAll(() => {
  environment.closeSSEConnections()
})

async function runCleanup(errors: unknown[], cleanup: () => Promise<unknown>): Promise<void> {
  try {
    await cleanup()
  } catch (error) {
    errors.push(error)
  }
}

// waits for all requests, also when some of them fail, and throws the failures afterwards
async function settleAll(requests: Promise<unknown>[]): Promise<void> {
  const results = await Promise.allSettled(requests)
  const errors = results
    .filter((result) => result.status === 'rejected')
    .map((result) => result.reason)
  if (errors.length) {
    throw new AggregateError(
      errors,
      `${errors.length} of ${requests.length} cleanup requests failed`
    )
  }
}

const cleanUpUser = async (createdUserStore: Map<string, User>, adminUser: User) => {
  const requests: Promise<User>[] = []
  createdUserStore.forEach((user) => {
    if (appConfig.keycloak) {
      requests.push(api.keycloak.deleteUser({ user }))
    } else {
      requests.push(api.graph.deleteUser({ user, admin: adminUser }))
    }
  })
  try {
    await settleAll(requests)
  } finally {
    createdUserStore.clear()
  }
}

const cleanUpGuests = async (adminUser: User) => {
  const requests: Promise<void>[] = []
  store.invitedGuestStore.forEach((mail) => {
    requests.push(
      api.graph.getUserIdByMail({ mail, admin: adminUser }).then(async (id) => {
        if (!id) {
          return
        }
        await api.graph.deleteUser({
          user: { id: mail, username: id, displayName: mail, email: mail, password: '' },
          admin: adminUser
        })
      })
    )
  })
  try {
    await settleAll(requests)
  } finally {
    store.invitedGuestStore.clear()
  }
}

const cleanUpSpaces = async (adminUser: User) => {
  const requests: Promise<void>[] = []
  store.createdSpaceStore.forEach((space) => {
    requests.push(
      api.graph
        .disableSpace({
          user: adminUser,
          space
        })
        .then(async (res) => {
          if (res.status() === 204) {
            await api.graph.deleteSpace({
              user: adminUser,
              space
            })
          }
        })
    )
  })
  try {
    await settleAll(requests)
  } finally {
    store.createdSpaceStore.clear()
  }
}

const cleanUpGroup = async (adminUser: User) => {
  const requests: Promise<Group>[] = []
  store.createdGroupStore.forEach((group) => {
    if (appConfig.keycloak) {
      requests.push(api.keycloak.deleteGroup({ group }))
    } else {
      requests.push(api.graph.deleteGroup({ group, admin: adminUser }))
    }
  })

  try {
    await settleAll(requests)
  } finally {
    store.createdGroupStore.clear()
  }
}

const isOcm = (world: World): boolean => {
  return world.tags?.includes('@ocm') ?? false
}
