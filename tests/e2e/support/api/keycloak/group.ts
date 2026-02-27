import { urlJoin } from '../../utils/urlJoin'
import { request, realmBasePath } from './utils'
import { checkResponseStatus } from '../http'
import { Group, User } from '../../types'
import { UsersEnvironment } from '../../environment'
import { getAdminUser, getRealmRole, openCloudKeycloakUserRoles } from './user'

export const createGroup = async ({
  group,
  role
}: {
  group: Group
  role?: string
}): Promise<Group> => {
  const creationRes = await request({
    method: 'POST',
    path: urlJoin(realmBasePath, 'groups'),
    body: { name: group.displayName },
    user: getAdminUser(),
    header: { 'Content-Type': 'application/json' }
  })
  checkResponseStatus(creationRes, 'Failed while creating group')
  const groupId = creationRes.headers()['location'].split('/').pop()
  const usersEnvironment = new UsersEnvironment()
  usersEnvironment.storeCreatedGroup({ group: { ...group, keycloakUuid: groupId } })

  if (role) {
    const roleData = await getRealmRole(openCloudKeycloakUserRoles[role])
    const roleAssignmentRes = await request({
      method: 'POST',
      path: urlJoin(realmBasePath, 'groups', groupId, 'role-mappings/realm'),
      body: [
        {
          id: roleData.id,
          name: roleData.name,
          description: '',
          composite: false,
          clientRole: false,
          containerId: 'openCloud'
        }
      ],
      user: getAdminUser(),
      header: { 'Content-Type': 'application/json' }
    })
    checkResponseStatus(roleAssignmentRes, `Failed while assigning role ${role} to group`)
  }
  return group
}

export const addUserToGroup = async ({
  user,
  group
}: {
  user: User
  group: Group
}): Promise<void> => {
  const response = await request({
    method: 'PUT',
    path: urlJoin(realmBasePath, 'users', user.keycloakUuid, 'groups', group.keycloakUuid),
    body: {},
    user: getAdminUser(),
    header: { 'Content-Type': 'application/json' }
  })
  checkResponseStatus(response, 'Failed while adding a user to the group')
}

export const deleteGroup = async ({ group }: { group: Group }): Promise<Group> => {
  const response = await request({
    method: 'DELETE',
    path: urlJoin(realmBasePath, 'groups', group.keycloakUuid),
    body: {},
    user: getAdminUser(),
    header: { 'Content-Type': 'application/json' }
  })
  checkResponseStatus(response, 'Failed while adding a user to the group')
  return group
}
