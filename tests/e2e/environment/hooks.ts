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
    }
  }

  world.uniquePrefix = uuidv4().substring(0, 3)
  world.a11yEnabled = world.tags?.includes('@a11y') ?? false
})

After(async ({ world }) => {
  appConfig.federatedServer = false

  await world.actorsEnvironment.close()

  // refresh keycloak admin access token
  if (appConfig.keycloak) {
    const user = world.usersEnvironment.getUser({ key: 'admin' })
    await api.keycloak.refreshKeycloakAdminAccessToken()
    await api.keycloak.refreshAccessTokenForKeycloakOpenCloudUser(user)
  }

  if (isOcm(world)) {
    appConfig.federatedServer = true
    await cleanUpUser(store.federatedUserStore, world.usersEnvironment.getUser({ key: 'admin' }))
    appConfig.federatedServer = false
  }

  await cleanUpUser(store.createdUserStore, world.usersEnvironment.getUser({ key: 'admin' }))
  await cleanUpSpaces(world.usersEnvironment.getUser({ key: 'admin' }))
  await cleanUpGroup(world.usersEnvironment.getUser({ key: 'admin' }))

  store.createdLinkStore.clear()
  store.createdTokenStore.clear()
  store.federatedTokenStore.clear()
  store.keycloakTokenStore.clear()
  utils.removeTempUploadDirectory()
  environment.closeSSEConnections()
})

AfterAll(() => {
  environment.closeSSEConnections()
})

const cleanUpUser = async (createdUserStore: Map<string, User>, adminUser: User) => {
  const requests: Promise<User>[] = []
  createdUserStore.forEach((user) => {
    if (appConfig.keycloak) {
      requests.push(api.keycloak.deleteUser({ user }))
    } else {
      requests.push(api.graph.deleteUser({ user, admin: adminUser }))
    }
  })
  await Promise.all(requests)
  createdUserStore.clear()
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
  await Promise.all(requests)
  store.createdSpaceStore.clear()
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

  await Promise.all(requests)
  store.createdGroupStore.clear()
}

const isOcm = (world: World): boolean => {
  return world.tags?.includes('@ocm') ?? false
}
