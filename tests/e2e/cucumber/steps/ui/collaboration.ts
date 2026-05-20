import { When, Then } from '@cucumber/cucumber'
import { expect } from '@playwright/test'
import { World } from '../../environment'
import {
  awaitCollabStatus,
  collabContent,
  codemirrorLine,
  remoteCaretCount,
  remoteCaretLabelText,
  type CollabEditor
} from '../../../support/objects/app-files/utils/collab'
import { api } from '../../../support'

Then(
  /^"([^"]+)" should see the realtime collab status "(connected|disconnected|connecting|local)"$/,
  async function (
    this: World,
    stepUser: string,
    status: 'connected' | 'disconnected' | 'connecting' | 'local'
  ): Promise<void> {
    const { page } = this.actorsEnvironment.getActor({ key: stepUser })
    await awaitCollabStatus(page, status)
  }
)

Then(
  /^"([^"]+)" should see content "([^"]+)" in the "(codemirror|tiptap|text-editor)" editor$/,
  async function (
    this: World,
    stepUser: string,
    text: string,
    editor: CollabEditor
  ): Promise<void> {
    const { page } = this.actorsEnvironment.getActor({ key: stepUser })
    await expect(collabContent(page, editor)).toContainText(text, { timeout: 10_000 })
  }
)

Then(
  /^"([^"]+)" should not see content "([^"]+)" in the "(codemirror|tiptap|text-editor)" editor$/,
  async function (
    this: World,
    stepUser: string,
    text: string,
    editor: CollabEditor
  ): Promise<void> {
    const { page } = this.actorsEnvironment.getActor({ key: stepUser })
    await expect(collabContent(page, editor)).not.toContainText(text)
  }
)

When(
  /^"([^"]+)" types "([^"]+)" at the end of the "(codemirror|tiptap|text-editor)" editor$/,
  async function (
    this: World,
    stepUser: string,
    text: string,
    editor: CollabEditor
  ): Promise<void> {
    const { page } = this.actorsEnvironment.getActor({ key: stepUser })
    await collabContent(page, editor).click()
    await page.keyboard.press('End')
    await page.keyboard.type(text)
  }
)

When(
  /^"([^"]+)" places the caret on line (\d+) in the codemirror editor$/,
  async function (this: World, stepUser: string, lineNumber: string): Promise<void> {
    const { page } = this.actorsEnvironment.getActor({ key: stepUser })
    // Feature uses 1-based line numbers, locator is 0-based.
    await codemirrorLine(page, parseInt(lineNumber, 10) - 1).click()
    await page.keyboard.press('End')
  }
)

When(
  /^"([^"]+)" saves the current file with Ctrl\+S$/,
  async function (this: World, stepUser: string): Promise<void> {
    const { page } = this.actorsEnvironment.getActor({ key: stepUser })
    // Give the wrapper's debounced serialize a chance to publish the dirty
    // content into AppWrapper before we trigger its save.
    await page.waitForTimeout(500)
    await Promise.all([
      page.waitForResponse(
        (resp) => resp.request().method() === 'PUT' && [204, 201].includes(resp.status())
      ),
      page.keyboard.press('Control+s')
    ])
  }
)

Then(
  /^"([^"]+)" should see a remote caret on line (\d+) labelled "([^"]+)"$/,
  async function (
    this: World,
    stepUser: string,
    lineNumber: string,
    label: string
  ): Promise<void> {
    const { page } = this.actorsEnvironment.getActor({ key: stepUser })
    const lineIdx = parseInt(lineNumber, 10) - 1
    await expect(codemirrorLine(page, lineIdx).locator('.cm-ySelectionCaret')).toHaveCount(1, {
      timeout: 10_000
    })
    // y-codemirror's label appears the first time the peer's awareness
    // entry includes a `user.name`; the server stamps that during
    // beforeHandleAwareness.
    await expect.poll(async () => await remoteCaretLabelText(page)).toContain(label)
  }
)

Then(
  /^"([^"]+)" should not see any remote caret$/,
  async function (this: World, stepUser: string): Promise<void> {
    const { page } = this.actorsEnvironment.getActor({ key: stepUser })
    await expect.poll(async () => await remoteCaretCount(page)).toBe(0)
  }
)

Then(
  /^the file "([^"]+)" in "([^"]+)"'s personal space should contain "([^"]+)"$/,
  async function (
    this: World,
    pathToFile: string,
    stepUser: string,
    expected: string
  ): Promise<void> {
    const user = this.usersEnvironment.getCreatedUser({ key: stepUser })
    await expect
      .poll(async () => await api.dav.getFileContentInPersonalSpace({ user, pathToFile }), {
        timeout: 10_000
      })
      .toContain(expected)
  }
)
