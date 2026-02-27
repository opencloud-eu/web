import { urlJoin } from '../../utils/urlJoin'
import { getUserIdFromResponse, request, realmBasePath } from './utils'
import { deleteUser as graphDeleteUser, getUserId } from '../graph'
import { checkResponseStatus } from '../http'
import { User, KeycloakRealmRole } from '../../types'
import { UsersEnvironment } from '../../environment'
import { keycloakRealmRoles } from '../../store'
import { state } from '../../../cucumber/environment/shared'
import { initializeUser } from '../../utils/tokenHelper'
import { setAccessTokenForKeycloakOpenCloudUser } from './openCloudUserToken'
import { getKeycloakAdminUser } from './utils'

export const openCloudKeycloakUserRoles: Record<string, string> = {
  Admin: 'opencloudAdmin',
  'Space Admin': 'opencloudSpaceAdmin',
  User: 'opencloudUser',
  'User Light': 'opencloudGuest'
}

export const getAdminUser = (): User => {
  const usersEnvironment = new UsersEnvironment()
  return usersEnvironment.getUser({ key: 'admin' })
}

export const createUser = async ({ user }: { user: User }): Promise<User> => {
  const fullName = user.displayName.split(' ')

  const body = {
    username: user.username,
    credentials: [{ value: user.password, type: 'password' }],
    firstName: fullName[0],
    lastName: fullName[1] ?? '',
    email: user.email,
    emailVerified: true,
    enabled: true
  }

  // create a user
  const creationRes = await request({
    method: 'POST',
    path: urlJoin(realmBasePath, 'users'),
    body,
    user: getKeycloakAdminUser(),
    header: { 'Content-Type': 'application/json' }
  })
  checkResponseStatus(creationRes, 'Failed while creating user')

  // created user id
  const keycloakUUID = getUserIdFromResponse(creationRes)

  // login to initialize the user in OpenCloud Web
  await initializeUser({
    browser: state.browser,
    user,
    waitForSelector: '#web-content'
  })

  const usersEnvironment = new UsersEnvironment()
  usersEnvironment.storeCreatedUser({
    user: {
      ...user,
      uuid: await getUserId({ user, admin: getAdminUser() }),
      keycloakUuid: keycloakUUID
    }
  })

  await setAccessTokenForKeycloakOpenCloudUser(user)
  return user
}

export const assignRole = async ({ uuid, role }: { uuid: string; role: string }) => {
  return request({
    method: 'POST',
    path: urlJoin(realmBasePath, 'users', uuid, 'role-mappings', 'realm'),
    body: [
      await getRealmRole(openCloudKeycloakUserRoles[role]),
      await getRealmRole('offline_access')
    ],
    user: getKeycloakAdminUser(),
    header: { 'Content-Type': 'application/json' }
  })
}

export const unAssignRole = async ({ uuid, role }: { uuid: string; role: string }) => {
  // can't unassign multiple realm roles at once
  const response = await request({
    method: 'DELETE',
    path: urlJoin(realmBasePath, 'users', uuid, 'role-mappings', 'realm'),
    body: [await getRealmRole(openCloudKeycloakUserRoles[role])],
    user: getKeycloakAdminUser(),
    header: { 'Content-Type': 'application/json' }
  })
  checkResponseStatus(response, 'Can not delete existing role ')
  return response
}

export const deleteUser = async ({ user }: { user: User }): Promise<User> => {
  // first delete OpenCloud user
  // deletes the user data
  await graphDeleteUser({ user, admin: getAdminUser() })

  const usersEnvironment = new UsersEnvironment()
  const response = await request({
    method: 'DELETE',
    path: urlJoin(
      realmBasePath,
      'users',
      usersEnvironment.getCreatedUser({ key: user.id }).keycloakUuid
    ),
    user: getKeycloakAdminUser()
  })
  checkResponseStatus(response, 'Failed to delete keycloak user: ' + user.id)
  if (response.ok) {
    try {
      const usersEnvironment = new UsersEnvironment()
      usersEnvironment.removeCreatedUser({ key: user.id })
    } catch (e) {
      console.error('Error removing Keycloak user:', e)
    }
  }
  return user
}

export const getRealmRole = async (role: string): Promise<KeycloakRealmRole> => {
  if (keycloakRealmRoles.get(role)) {
    return keycloakRealmRoles.get(role)
  }

  const response = await request({
    method: 'GET',
    path: urlJoin(realmBasePath, 'roles'),
    user: getKeycloakAdminUser()
  })
  checkResponseStatus(response, 'Failed while fetching realm roles')
  const roles = (await response.json()) as KeycloakRealmRole[]

  roles.forEach((role: KeycloakRealmRole) => {
    keycloakRealmRoles.set(role.name, role)
  })

  if (keycloakRealmRoles.get(role)) {
    return keycloakRealmRoles.get(role)
  }

  throw new Error(`Role '${role}' not found in the keycloak realm`)
}
