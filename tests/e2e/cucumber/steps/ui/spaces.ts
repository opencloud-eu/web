import { DataTable, When, Then } from '@cucumber/cucumber'
import { expect } from '@playwright/test'
import { World } from '../../environment'
import { objects } from '../../../support'
import { Space } from '../../../support/types'

When(
  '{string} navigates to the personal space page',
  async function (this: World, stepUser: string): Promise<void> {
    const { page } = this.actorsEnvironment.getActor({ key: stepUser })
    const pageObject = new objects.applicationFiles.page.spaces.Personal({ page })
    await pageObject.navigate()
  }
)

When(
  '{string} navigates to the projects space page',
  async function (this: World, stepUser: string): Promise<void> {
    const { page } = this.actorsEnvironment.getActor({ key: stepUser })
    const pageObject = new objects.applicationFiles.page.spaces.Projects({ page })
    await pageObject.navigate()
  }
)

When(
  '{string} creates the following project spaces',
  async function (this: World, stepUser: string, stepTable: DataTable): Promise<void> {
    const { page } = this.actorsEnvironment.getActor({ key: stepUser })
    const spacesObject = new objects.applicationFiles.Spaces({ page })

    for (const space of stepTable.hashes()) {
      await spacesObject.create({ key: space.id || space.name, space: space as unknown as Space })
    }
  }
)

When(
  '{string} navigates to the project space {string}',
  async function (this: World, stepUser: string, key: string): Promise<void> {
    const { page } = this.actorsEnvironment.getActor({ key: stepUser })
    const spacesObject = new objects.applicationFiles.Spaces({ page })
    const pageObject = new objects.applicationFiles.page.spaces.Projects({ page })
    await pageObject.navigate()
    await spacesObject.open({ key })
  }
)

When(
  /^"([^"]*)" (?:changes|updates) the space "([^"]*)" (name|subtitle|description|quota|image|icon) to "([^"]*)"$/,
  async function (
    this: World,
    stepUser: string,
    key: string,
    attribute: string,
    value: string
  ): Promise<void> {
    const { page } = this.actorsEnvironment.getActor({ key: stepUser })
    const spacesObject = new objects.applicationFiles.Spaces({ page })

    switch (attribute) {
      case 'name':
        await spacesObject.changeName({ key, value })
        break
      case 'subtitle':
        await spacesObject.changeSubtitle({ key, value })
        break
      case 'description':
        await spacesObject.changeDescription({ value })
        break
      case 'quota':
        await spacesObject.changeQuota({ key, value })
        break
      case 'image':
        await spacesObject.changeSpaceImage({
          key,
          resource: this.filesEnvironment.getFile({ name: value })
        })
        break
      case 'icon':
        await spacesObject.changeSpaceIcon({ key, icon: value })
        break
      default:
        throw new Error(`${attribute} not implemented`)
    }
  }
)

When(
  /^"([^"]*)" changes the space "([^"]*)" (name|subtitle|description|quota|image|icon) to "([^"]*)" using context menu$/,
  async function (
    this: World,
    stepUser: string,
    key: string,
    attribute: string,
    value: string
  ): Promise<void> {
    const { page } = this.actorsEnvironment.getActor({ key: stepUser })
    const spacesObject = new objects.applicationFiles.Spaces({ page })

    switch (attribute) {
      case 'name':
        await spacesObject.changeName({ key, value, contextMenu: true })
        break
      case 'subtitle':
        await spacesObject.changeSubtitle({ key, value, contextMenu: true })
        break
      case 'description':
        await spacesObject.changeDescription({ value, contextMenu: true })
        break
      case 'quota':
        await spacesObject.changeQuota({ key, value, contextMenu: true })
        break
      case 'image':
        await spacesObject.changeSpaceImage({
          key,
          resource: this.filesEnvironment.getFile({ name: value }),
          contextMenu: true
        })
        break
      case 'icon':
        await spacesObject.changeSpaceIcon({ key, icon: value, contextMenu: true })
        break
      default:
        throw new Error(`${attribute} not implemented`)
    }
  }
)

When(
  '{string} deletes the space {string} image using context menu',
  async function (this: World, stepUser: string, space: string): Promise<void> {
    const { page } = this.actorsEnvironment.getActor({ key: stepUser })
    const spacesObject = new objects.applicationFiles.Spaces({ page })
    await spacesObject.deleteSpaceImage({ space, contextMenu: true })
  }
)

When(
  '{string} deletes the space {string} image',
  async function (this: World, stepUser: string, space: string): Promise<void> {
    const { page } = this.actorsEnvironment.getActor({ key: stepUser })
    const spacesObject = new objects.applicationFiles.Spaces({ page })
    await spacesObject.deleteSpaceImage({ space })
  }
)

When(
  '{string} adds following user(s) to the project space',
  async function (this: World, stepUser: string, stepTable: DataTable): Promise<void> {
    const { page } = this.actorsEnvironment.getActor({ key: stepUser })
    const spacesObject = new objects.applicationFiles.Spaces({ page })
    for (const { user, role, kind } of stepTable.hashes()) {
      const collaborator =
        kind === 'user'
          ? this.usersEnvironment.getCreatedUser({ key: user })
          : this.usersEnvironment.getCreatedGroup({ key: user })
      const collaboratorWithRole = {
        collaborator,
        role
      }
      await spacesObject.addMembers({ users: [collaboratorWithRole] })
    }
  }
)

When(
  '{string} removes access to following users from the project space',
  async function (this: World, stepUser: string, stepTable: DataTable): Promise<void> {
    const { page } = this.actorsEnvironment.getActor({ key: stepUser })
    const spacesObject = new objects.applicationFiles.Spaces({ page })
    for (const { user, role } of stepTable.hashes()) {
      const member = {
        collaborator: this.usersEnvironment.getCreatedUser({ key: user }),
        role
      }
      await spacesObject.removeAccessToMember({ users: [member] })
    }
  }
)

Then(
  /^"([^"]*)" (should|should not) see space "([^"]*)"$/,
  async function (this: World, stepUser: string, actionType: string, space: string): Promise<void> {
    const { page } = this.actorsEnvironment.getActor({ key: stepUser })
    const spacesObject = new objects.applicationFiles.Spaces({ page })
    const spaceLocator = spacesObject.getSpaceLocator(space)
    actionType === 'should'
      ? await expect(spaceLocator).toBeVisible()
      : await expect(spaceLocator).not.toBeVisible()
  }
)

When(
  '{string} changes the roles of the following users in the project space',
  async function (this: World, stepUser: string, stepTable: DataTable): Promise<void> {
    const { page } = this.actorsEnvironment.getActor({ key: stepUser })
    const spacesObject = new objects.applicationFiles.Spaces({ page })
    for (const { user, role } of stepTable.hashes()) {
      const member = {
        collaborator: this.usersEnvironment.getCreatedUser({ key: user }),
        role
      }
      await spacesObject.changeRoles({ users: [member] })
    }
  }
)

When(
  '{string} as project manager removes their own access to the project space',
  async function (this: World, stepUser: any): Promise<void> {
    const { page } = this.actorsEnvironment.getActor({ key: stepUser })
    const spacesObject = new objects.applicationFiles.Spaces({ page })
    await spacesObject.removeAccessToMember({
      users: [
        {
          collaborator: this.usersEnvironment.getCreatedUser({ key: stepUser })
        }
      ],
      removeOwnSpaceAccess: true
    })
  }
)

When(
  '{string} sets the expiration date of the member {string} of the project space to {string}',
  async function (
    this: World,
    stepUser: string,
    memberName: string,
    expirationDate: string
  ): Promise<void> {
    const { page } = this.actorsEnvironment.getActor({ key: stepUser })
    const spacesObject = new objects.applicationFiles.Spaces({ page })
    const member = { collaborator: this.usersEnvironment.getCreatedUser({ key: memberName }) }
    await spacesObject.addExpirationDate({ member, expirationDate })
  }
)

When(
  '{string} removes the expiration date of the member {string} of the project space',
  async function (this: World, stepUser: string, memberName: string): Promise<void> {
    const { page } = this.actorsEnvironment.getActor({ key: stepUser })
    const spacesObject = new objects.applicationFiles.Spaces({ page })
    const member = { collaborator: this.usersEnvironment.getCreatedUser({ key: memberName }) }
    await spacesObject.removeExpirationDate({ member })
  }
)

When(
  /^"([^"]*)" downloads the space (?:"[^"]*")$/,
  async function (this: World, stepUser: string): Promise<void> {
    const { page } = this.actorsEnvironment.getActor({ key: stepUser })
    const spacesObject = new objects.applicationFiles.Spaces({ page })
    const downloadedResource = await spacesObject.downloadSpace()
    expect(downloadedResource).toContain('download.zip')
  }
)

Then(
  '{string} should see activity of the space',
  async function (this: World, stepUser: string, stepTable: DataTable): Promise<void> {
    const { page } = this.actorsEnvironment.getActor({ key: stepUser })
    const spacesObject = new objects.applicationFiles.Spaces({ page })

    for (const info of stepTable.hashes()) {
      await spacesObject.checkSpaceActivity({ activity: info.activity })
    }
  }
)

Then(
  '{string} should see activities of the space mathing the following regex',
  async function (this: World, stepUser: string, stepTable: DataTable): Promise<void> {
    const { page } = this.actorsEnvironment.getActor({ key: stepUser })
    const spacesObject = new objects.applicationFiles.Spaces({ page })

    for (const info of stepTable.hashes()) {
      await spacesObject.checkSpaceActivity({ activity: new RegExp(info.activity) })
    }
  }
)

Then(
  /^space image should match (\d+)\/(\d+) ratio for user "([^"]+)"$/,
  async function (
    this: World,
    expectedWidth: string,
    expectedHeight: string,
    stepUser: string
  ): Promise<void> {
    const { page } = this.actorsEnvironment.getActor({ key: stepUser })
    const spacesObject = new objects.applicationFiles.Spaces({ page })
    const { width, height } = await spacesObject.getSpaceImageRatio()

    expect(parseInt(expectedWidth)).toBe(width / 10)
    expect(parseInt(expectedHeight)).toBe(height / 10)
  }
)
