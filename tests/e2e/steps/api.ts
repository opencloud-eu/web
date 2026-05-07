import { World } from '../environment/world'
import { api } from '../support'
import fs from 'fs'
import { Space } from '../support/types'
import { Given, When } from '../environment/fixtures'
import { DataTable } from 'playwright-bdd'

Given(
  '{string} creates following user(s) using API',
  async ({ world }: { world: World }, stepUser: string, stepTable: DataTable): Promise<void> => {
    const admin = world.usersEnvironment.getUser({ key: stepUser })

    for (const info of stepTable.hashes()) {
      const uniqueId = `${info.id}-${world.uniquePrefix}`
      const user = {
        ...world.usersEnvironment.getUser({ key: info.id }),
        id: info.id,
        username: uniqueId,
        email: `${uniqueId}@example.org`
      }

      await api.graph.createUser({ user, admin })
    }
  }
)

Given(
  'admin creates following user(s) using keycloak API',
  async ({ world }: { world: World }, stepTable: DataTable): Promise<void> => {
    for (const info of stepTable.hashes()) {
      const uniqueId = `${info.id}-${world.uniquePrefix}`
      // use a unique user name
      const user = {
        ...world.usersEnvironment.getUser({ key: info.id }),
        id: info.id,
        username: uniqueId,
        email: `${uniqueId}@example.org`
      }

      await api.keycloak.createUser({ user })
    }
  }
)

Given(
  '{string} assigns following roles to the users using API',
  async ({ world }: { world: World }, stepUser: string, stepTable: DataTable): Promise<void> => {
    const admin = world.usersEnvironment.getUser({ key: stepUser })
    for await (const info of stepTable.hashes()) {
      const user = world.usersEnvironment.getCreatedUser({ key: info.id })
      await api.graph.assignRole(admin, user.uuid, info.role)
    }
  }
)

Given(
  'admin assigns following roles to the user(s) using keycloak API',
  async ({ world }: { world: World }, stepTable: DataTable): Promise<void> => {
    for await (const info of stepTable.hashes()) {
      const user = world.usersEnvironment.getCreatedUser({ key: info.id })
      await api.keycloak.assignRole({ uuid: user.keycloakUuid, role: info.role })
    }
  }
)

Given(
  '{string} creates following group(s) using API',
  async ({ world }: { world: World }, stepUser: string, stepTable: DataTable): Promise<void> => {
    const admin = world.usersEnvironment.getUser({ key: stepUser })

    for (const info of stepTable.hashes()) {
      const uniqueId = `${info.id}-${world.uniquePrefix}`
      const group = {
        ...world.usersEnvironment.getGroup({ key: info.id }),
        id: info.id,
        displayName: uniqueId
      }
      await api.graph.createGroup({ group, admin })
    }
  }
)

Given(
  'admin creates following group(s) using keycloak API',
  async ({ world }: { world: World }, stepTable: DataTable): Promise<void> => {
    for (const info of stepTable.hashes()) {
      const uniqueId = `${info.id}-${world.uniquePrefix}`
      const group = {
        ...world.usersEnvironment.getGroup({ key: info.id }),
        id: info.id,
        displayName: uniqueId
      }
      await api.keycloak.createGroup({ group, role: info.role })
    }
  }
)

Given(
  '{string} adds user(s) to the group(s) using API',
  async ({ world }: { world: World }, stepUser: string, stepTable: DataTable): Promise<void> => {
    const admin = world.usersEnvironment.getUser({ key: stepUser })

    for (const info of stepTable.hashes()) {
      const userId = world.usersEnvironment.getCreatedUser({ key: info.user }).uuid
      const groupId = world.usersEnvironment.getCreatedGroup({ key: info.group }).uuid
      await api.graph.addUserToGroup({ userId, groupId, admin })
    }
  }
)

Given(
  'admin adds user(s) to the group(s) using keycloak API',
  async ({ world }: { world: World }, stepTable: DataTable): Promise<void> => {
    for (const info of stepTable.hashes()) {
      const user = world.usersEnvironment.getCreatedUser({ key: info.user })
      const group = world.usersEnvironment.getCreatedGroup({ key: info.group })
      await api.keycloak.addUserToGroup({ user, group })
    }
  }
)

Given(
  '{string} creates the following folder(s) in personal space using API',
  async ({ world }: { world: World }, stepUser: string, stepTable: DataTable): Promise<void> => {
    const user = world.usersEnvironment.getCreatedUser({ key: stepUser })
    for (const info of stepTable.hashes()) {
      await api.dav.createFolderInsidePersonalSpace({ user, folder: info.name })
    }
  }
)

Given(
  '{string} creates {int} folder(s) in personal space using API',
  async ({ world }: { world: World }, stepUser: string, numberOfFolders: number): Promise<void> => {
    const user = world.usersEnvironment.getCreatedUser({ key: stepUser })
    for (let i = 1; i <= numberOfFolders; i++) {
      await api.dav.createFolderInsidePersonalSpace({ user, folder: `testFolder${i}` })
    }
  }
)

Given(
  '{string} shares the following resource using API',
  async ({ world }: { world: World }, stepUser: string, stepTable: DataTable): Promise<void> => {
    const user = world.usersEnvironment.getCreatedUser({ key: stepUser })
    for (const info of stepTable.hashes()) {
      await api.share.createShare({
        user,
        path: info.resource,
        shareType: info.type,
        shareWith: info.recipient,
        role: info.role
      })
    }
  }
)

Given(
  '{string} disables auto-accepting using API',
  async ({ world }: { world: World }, stepUser: string): Promise<void> => {
    const user = world.usersEnvironment.getCreatedUser({ key: stepUser })
    await api.settings.disableAutoAcceptShare({ user })
  }
)

Given(
  '{string} creates the following file(s) into personal space using API',
  async ({ world }: { world: World }, stepUser: string, stepTable: DataTable): Promise<void> => {
    const user = world.usersEnvironment.getCreatedUser({ key: stepUser })
    for (const info of stepTable.hashes()) {
      await api.dav.uploadFileInPersonalSpace({
        user,
        pathToFile: info.pathToFile,
        content: info.content
      })
    }
  }
)

Given(
  '{string} creates the following file(s) with mtime into personal space using API',
  async ({ world }: { world: World }, stepUser: string, stepTable: DataTable): Promise<void> => {
    const user = world.usersEnvironment.getCreatedUser({ key: stepUser })
    for (const info of stepTable.hashes()) {
      await api.dav.uploadFileInPersonalSpace({
        user,
        pathToFile: info.pathToFile,
        content: info.content,
        mtimeDeltaDays: info.mtimeDeltaDays
      })
    }
  }
)

Given(
  '{string} creates {int} file(s) in personal space using API',
  async ({ world }: { world: World }, stepUser: string, numberOfFiles: number): Promise<void> => {
    const user = world.usersEnvironment.getCreatedUser({ key: stepUser })
    for (let i = 1; i <= numberOfFiles; i++) {
      await api.dav.uploadFileInPersonalSpace({
        user,
        pathToFile: `testfile${i}.txt`,
        content: `This is a test file${i}`
      })
    }
  }
)

Given(
  '{string} uploads the following local file(s) into personal space using API',
  async ({ world }: { world: World }, stepUser: string, stepTable: DataTable): Promise<void> => {
    const user = world.usersEnvironment.getCreatedUser({ key: stepUser })
    for (const info of stepTable.hashes()) {
      const fileInfo = world.filesEnvironment.getFile({ name: info.localFile })
      const content = fs.readFileSync(fileInfo.path)
      await api.dav.uploadFileInPersonalSpace({
        user,
        pathToFile: info.to,
        content
      })
    }
  }
)

Given(
  '{string} creates the following project space(s) using API',
  async ({ world }: { world: World }, stepUser: string, stepTable: DataTable): Promise<void> => {
    const user =
      stepUser === 'Admin'
        ? world.usersEnvironment.getUser({ key: stepUser })
        : world.usersEnvironment.getCreatedUser({ key: stepUser })
    for (const space of stepTable.hashes()) {
      const spaceId = await api.graph.createSpace({ user, space: space as unknown as Space })
      world.spacesEnvironment.createSpace({
        key: space.id || space.name,
        space: { name: space.name, id: spaceId }
      })
    }
  }
)

Given(
  '{string} creates the following file(s) in space {string} using API',
  async (
    { world }: { world: World },
    stepUser: string,
    space: string,
    stepTable: DataTable
  ): Promise<void> => {
    const user = world.usersEnvironment.getCreatedUser({ key: stepUser })
    for (const info of stepTable.hashes()) {
      await api.dav.uploadFileInsideSpaceBySpaceName({
        user,
        pathToFile: info.name,
        spaceName: space,
        content: info.content
      })
    }
  }
)

Given(
  '{string} creates the following folder(s) in space {string} using API',
  async (
    { world }: { world: World },
    stepUser: string,
    space: string,
    stepTable: DataTable
  ): Promise<void> => {
    const user = world.usersEnvironment.getCreatedUser({ key: stepUser })
    for (const info of stepTable.hashes()) {
      await api.dav.createFolderInsideSpaceBySpaceName({
        user,
        folder: info.name,
        spaceName: space
      })
    }
  }
)

Given(
  '{string} adds the following member(s) to the space {string} using API',
  async (
    { world }: { world: World },
    stepUser: string,
    space: string,
    stepTable: DataTable
  ): Promise<void> => {
    const user =
      stepUser === 'Admin'
        ? world.usersEnvironment.getUser({ key: stepUser })
        : world.usersEnvironment.getCreatedUser({ key: stepUser })
    for (const info of stepTable.hashes()) {
      await api.share.addMembersToTheProjectSpace({
        user,
        spaceName: space,
        shareWith: info.user,
        shareType: info.shareType,
        role: info.role
      })
    }
  }
)

Given(
  '{string} adds the following tags for the following resources using API',
  async ({ world }: { world: World }, stepUser: string, stepTable: DataTable): Promise<void> => {
    const user = world.usersEnvironment.getCreatedUser({ key: stepUser })
    for (const info of stepTable.hashes()) {
      await api.dav.addTagToResource({ user, resource: info.resource, tags: info.tags })
    }
  }
)

Given(
  '{string} creates a public link of following resource using API',
  async ({ world }: { world: World }, stepUser: string, stepTable: DataTable): Promise<void> => {
    const user = world.usersEnvironment.getCreatedUser({ key: stepUser })

    for (const info of stepTable.hashes()) {
      await api.share.createLinkShare({
        user,
        path: info.resource,
        password: info.password,
        name: info.name ? info.name : 'Unnamed link',
        role: info.role,
        spaceName: info.space
      })
    }
  }
)

Given(
  '{string} creates a public link of the space using API',
  async ({ world }: { world: World }, stepUser: string, stepTable: DataTable): Promise<void> => {
    const user = world.usersEnvironment.getCreatedUser({ key: stepUser })
    for (const info of stepTable.hashes()) {
      await api.share.createSpaceLinkShare({
        user,
        spaceName: info.space,
        password: info.password,
        name: info.name ? info.name : 'Unnamed link',
        role: info.role
      })
    }
  }
)

Given(
  '{string} has uploads the profile image {string} using API',
  async ({ world }: { world: World }, stepUser: string, profileImage: string): Promise<void> => {
    const user = world.usersEnvironment.getCreatedUser({ key: stepUser })
    const profileImagePath = world.filesEnvironment.getFile({ name: profileImage }).path
    await api.graph.uploadProfileImage({
      user,
      profileImage: profileImagePath
    })
  }
)

Given(
  '{string} deletes the following resource(s) from personal space using API',
  async ({ world }: { world: World }, stepUser: string, stepTable: DataTable): Promise<void> => {
    const user = world.usersEnvironment.getCreatedUser({ key: stepUser })
    for (const info of stepTable.hashes()) {
      await api.dav.deleteFileInPersonalSpace({
        user,
        pathToFile: info.resource
      })
    }
  }
)

When(
  'admin disables user {string} using keycloak API',
  async ({ world }: { world: World }, stepUser: string): Promise<void> => {
    const user = world.usersEnvironment.getCreatedUser({ key: stepUser })
    await api.keycloak.setUserEnabled({ uuid: user.keycloakUuid, enabled: false })
  }
)

When(
  'admin enables user {string} using keycloak API',
  async ({ world }: { world: World }, stepUser: string): Promise<void> => {
    const user = world.usersEnvironment.getCreatedUser({ key: stepUser })
    await api.keycloak.setUserEnabled({ uuid: user.keycloakUuid, enabled: true })
  }
)

When(
  'admin deletes sessions of user {string} using keycloak API',
  async ({ world }: { world: World }, stepUser: string): Promise<void> => {
    const user = world.usersEnvironment.getCreatedUser({ key: stepUser })
    await api.keycloak.deleteUserSessions({ uuid: user.keycloakUuid })
  }
)
