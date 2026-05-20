import { When, Then } from '@cucumber/cucumber'
import { expect } from '@playwright/test'
import { World } from '../../environment'
import {
  awaitCollabStatus,
  collabContent,
  codemirrorLine,
  remoteCaretCount,
  remoteCaretLabelText,
  excalidrawSceneElementCount,
  awaitExcalidrawMounted,
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
  async function (this: World, stepUser: string, lineNumber: string, label: string): Promise<void> {
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
  /^"([^"]+)" should see the excalidraw canvas mounted$/,
  async function (this: World, stepUser: string): Promise<void> {
    const { page } = this.actorsEnvironment.getActor({ key: stepUser })
    await awaitExcalidrawMounted(page)
  }
)

Then(
  /^"([^"]+)" should see (\d+) elements? in the excalidraw scene$/,
  async function (this: World, stepUser: string, count: string): Promise<void> {
    const { page } = this.actorsEnvironment.getActor({ key: stepUser })
    const expected = parseInt(count, 10)
    // Excalidraw hydrates from Y.Doc shortly after the canvas mounts —
    // poll for the count rather than read once. -1 means the test hook
    // hasn't been registered yet (component not mounted), which we treat
    // as "not yet".
    await expect
      .poll(async () => await excalidrawSceneElementCount(page), {
        timeout: 10_000
      })
      .toBe(expected)
  }
)

Then(
  /^"([^"]+)" should see at least (\d+) elements? in the excalidraw scene$/,
  async function (this: World, stepUser: string, count: string): Promise<void> {
    const { page } = this.actorsEnvironment.getActor({ key: stepUser })
    const minimum = parseInt(count, 10)
    await expect
      .poll(async () => await excalidrawSceneElementCount(page), {
        timeout: 10_000
      })
      .toBeGreaterThanOrEqual(minimum)
  }
)

When(
  /^"([^"]+)" adds a rectangle to the excalidraw scene via the API$/,
  async function (this: World, stepUser: string): Promise<void> {
    const { page } = this.actorsEnvironment.getActor({ key: stepUser })
    // Drawing on the canvas via Playwright pointer events is fragile —
    // Excalidraw's renderer uses requestAnimationFrame + pointer-capture
    // semantics that don't always match Playwright's synthetic events.
    // The test-only `window.__excalidrawAPI` hook lets us inject elements
    // directly through Excalidraw's own imperative API, which is exactly
    // what user drawing would land at. The y-excalidraw binding's
    // onChange picks the new element up the same way and propagates it
    // to the peer.
    await page.evaluate(() => {
      const w = window as unknown as {
        __excalidrawAPI?: {
          getSceneElements: () => readonly Record<string, unknown>[]
          updateScene: (args: { elements: Record<string, unknown>[] }) => void
        }
      }
      const api = w.__excalidrawAPI
      if (!api) throw new Error('__excalidrawAPI not available on window')
      const existing = api.getSceneElements()
      const id = `r-test-${Date.now()}`
      const rectangle: Record<string, unknown> = {
        id,
        type: 'rectangle',
        x: 400,
        y: 400,
        width: 120,
        height: 80,
        angle: 0,
        strokeColor: '#1971c2',
        backgroundColor: 'transparent',
        fillStyle: 'hachure',
        strokeWidth: 1,
        strokeStyle: 'solid',
        roughness: 1,
        opacity: 100,
        groupIds: [],
        frameId: null,
        roundness: null,
        seed: Math.floor(Math.random() * 1_000_000),
        version: 1,
        versionNonce: Math.floor(Math.random() * 1_000_000),
        isDeleted: false,
        boundElements: null,
        updated: Date.now(),
        link: null,
        locked: false
      }
      api.updateScene({ elements: [...existing, rectangle] })
    })
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
