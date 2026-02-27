import { checkResponseStatus, request } from '../http'
import { Group, Me, User } from '../../types'
import { urlJoin } from '../../utils/urlJoin'
import { config } from '../../../config'
import { getApplicationEntity } from './utils'
import { userRoleStore } from '../../store'
import { UsersEnvironment } from '../../environment'
import { setAccessAndRefreshToken } from '../token'
import { readFile } from 'fs/promises'

interface GroupResponse {
  value: Group[]
}

export const me = async ({ user }: { user: User }): Promise<Me> => {
  const response = await request({
    method: 'GET',
    path: urlJoin('graph', 'v1.0', 'me'),
    user
  })

  return (await response.json()) as Me
}

export const createUser = async ({ user, admin }: { user: User; admin: User }): Promise<User> => {
  const body = {
    displayName: user.displayName,
    mail: user.email,
    onPremisesSamAccountName: user.username,
    passwordProfile: { password: user.password }
  }

  const response = await request({
    method: 'POST',
    path: urlJoin('graph', 'v1.0', 'users'),
    body,
    user: admin
  })

  checkResponseStatus(response, 'Failed while creating user')

  const usersEnvironment = new UsersEnvironment()
  const resBody = (await response.json()) as User
  usersEnvironment.storeCreatedUser({ user: { ...user, uuid: resBody.id } })
  await setAccessAndRefreshToken(user)
  return user
}

export const deleteUser = async ({ user, admin }: { user: User; admin: User }): Promise<User> => {
  await request({
    method: 'DELETE',
    path: urlJoin('graph', 'v1.0', 'users', user.username),
    user: admin
  })
  try {
    const usersEnvironment = new UsersEnvironment()
    usersEnvironment.removeCreatedUser({ key: user.username })
  } catch {}
  return user
}

export const getUserId = async ({ user, admin }: { user: User; admin: User }): Promise<string> => {
  const response = await request({
    method: 'GET',
    path: urlJoin('graph', 'v1.0', 'users', user.username),
    user: admin
  })

  const resBody = (await response.json()) as User
  return resBody.id
}

export const createGroup = async ({
  group,
  admin
}: {
  group: Group
  admin: User
}): Promise<Group> => {
  const body = {
    displayName: group.displayName
  }

  const response = await request({
    method: 'POST',
    path: urlJoin('graph', 'v1.0', 'groups'),
    body,
    user: admin
  })

  checkResponseStatus(response, 'Failed while creating group')

  const usersEnvironment = new UsersEnvironment()
  const resBody = (await response.json()) as Group
  usersEnvironment.storeCreatedGroup({ group: { ...group, uuid: resBody.id } })
  return group
}

export const deleteGroup = async ({
  group,
  admin
}: {
  group: Group
  admin: User
}): Promise<Group> => {
  const usersEnvironment = new UsersEnvironment()
  const groupId = usersEnvironment.getCreatedGroup({ key: group.id }).uuid

  await request({
    method: 'DELETE',
    path: urlJoin('graph', 'v1.0', 'groups', groupId),
    user: admin
  })
  return group
}

export const addUserToGroup = async ({
  userId,
  groupId,
  admin
}: {
  userId: string
  groupId: string
  admin: User
}): Promise<void> => {
  const body = {
    '@odata.id': urlJoin(config.baseUrl, 'graph', 'v1.0', 'users', userId)
  }

  const response = await request({
    method: 'POST',
    path: urlJoin('graph', 'v1.0', 'groups', groupId, 'members', '$ref'),
    body: body,
    user: admin
  })
  checkResponseStatus(response, 'Failed while adding a user to the group')
}

export const assignRole = async (admin: User, id: string, role: string): Promise<void> => {
  const applicationEntity = await getApplicationEntity(admin)

  if (!userRoleStore.has(role)) {
    applicationEntity.appRoles.forEach((role) => {
      userRoleStore.set(role.displayName, role.id)
    })
  }
  if (userRoleStore.get(role) === undefined) {
    throw new Error(`unknown role "${role}"`)
  }
  const response = await request({
    method: 'POST',
    path: urlJoin('graph', 'v1.0', 'users', id, 'appRoleAssignments'),
    user: admin,
    body: {
      principalId: id,
      appRoleId: userRoleStore.get(role),
      resourceId: applicationEntity.id
    }
  })
  checkResponseStatus(response, 'Failed while assigning role to the user')
}

export const getGroups = async (adminUser: User): Promise<Group[]> => {
  const response = await request({
    method: 'GET',
    path: urlJoin('graph', 'v1.0', 'groups'),
    user: adminUser
  })
  const data = (await response.json()) as GroupResponse
  return data.value
}

export const uploadProfileImage = async ({
  user,
  profileImage
}: {
  user: User
  profileImage: string
}): Promise<void> => {
  const imageBuffer = await readFile(profileImage)

  const response = await request({
    method: 'PATCH',
    path: urlJoin('graph', 'v1.0', 'me', 'photo', '$value'),
    body: imageBuffer,
    user
  })

  checkResponseStatus(response, 'Failed while uploading user profile image')
}
