import { Group, User } from '../types'
import {
  dummyUserStore,
  dummyGroupStore,
  createdUserStore,
  createdGroupStore,
  keycloakCreatedUser,
  federatedUserStore,
  dummyKeycloakGroupStore
} from '../store'
import { config } from '../../config'

export class UsersEnvironment {
  getUser({ key }: { key: string }): User {
    const userKey = key.toLowerCase()

    if (!dummyUserStore.has(userKey)) {
      throw new Error(`user with key '${userKey}' not found`)
    }

    return dummyUserStore.get(userKey)
  }

  createUser({ key, user }: { key: string; user: User }): User {
    const userKey = key.toLowerCase()

    if (dummyUserStore.has(userKey)) {
      throw new Error(`user with key '${userKey}' already exists`)
    }

    dummyUserStore.set(userKey, user)

    return user
  }

  storeCreatedUser({ user }: { user: User }): User {
    const store = config.federatedServer ? federatedUserStore : createdUserStore
    if (store.has(user.id)) {
      throw new Error(`user '${user.id}' already exists`)
    }
    store.set(user.id, user)
    return user
  }

  getCreatedUser({ key, shareType }: { key: string; shareType?: string }): User {
    const store =
      shareType === 'external' || config.federatedServer ? federatedUserStore : createdUserStore
    if (!store.has(key)) {
      throw new Error(`user with key '${key}' not found`)
    }

    return store.get(key)
  }

  updateCreatedUser({ key, user }: { key: string; user: User }): User {
    if (!createdUserStore.has(key)) {
      throw new Error(`user '${key}' not found`)
    }
    this.removeCreatedUser({ key })
    createdUserStore.set(user.id, user)

    return user
  }

  removeCreatedUser({ key }: { key: string }): boolean {
    const store = config.federatedServer ? federatedUserStore : createdUserStore

    if (!store.has(key)) {
      throw new Error(`user '${key}' not found`)
    }

    return store.delete(key)
  }

  getGroup({ key }: { key: string }): Group {
    const groupKey = key.toLowerCase()
    const store = groupKey.startsWith('keycloak') ? dummyKeycloakGroupStore : dummyGroupStore

    if (!store.has(groupKey)) {
      throw new Error(`group with key '${groupKey}' not found`)
    }

    return store.get(groupKey)
  }

  getCreatedGroup({ key }: { key: string }): Group {
    if (!createdGroupStore.has(key)) {
      throw new Error(`group with key '${key}' not found`)
    }
    return createdGroupStore.get(key)
  }

  getCreatedGroupByDisplayName(displayName: string): Group {
    for (const group of createdGroupStore.values()) {
      if (group.displayName === displayName) {
        return group
      }
    }
    throw new Error(`Group with displayName '${displayName}' not found`)
  }

  storeCreatedGroup({ group }: { group: Group }): Group {
    if (createdGroupStore.has(group.id)) {
      throw new Error(`group with key '${group.id}' already exists`)
    }
    createdGroupStore.set(group.id, group)

    return group
  }

  storeCreatedKeycloakUser({ user }: { user: User }): User {
    if (keycloakCreatedUser.has(user.id)) {
      throw new Error(`Keycloak user '${user.id}' already exists`)
    }
    keycloakCreatedUser.set(user.id, user)
    return user
  }

  getCreatedKeycloakUser({ key }: { key: string }): User {
    if (!keycloakCreatedUser.has(key)) {
      throw new Error(`Keycloak user with key '${key}' not found`)
    }

    return keycloakCreatedUser.get(key)
  }

  removeCreatedKeycloakUser({ key }: { key: string }): boolean {
    if (!keycloakCreatedUser.has(key)) {
      throw new Error(`Keycloak user with key '${key}' not found`)
    }

    return keycloakCreatedUser.delete(key)
  }
}
