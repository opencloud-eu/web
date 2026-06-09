import { Given, DataTable, Then, When } from '@cucumber/cucumber'
import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { expect } from '@playwright/test'
import { World } from '../environment'
import { config } from '../../config'
import { dragDropFiles } from '../../support/utils/dragDrop'

// Builds an rclone-crypt encrypted vault directly on the OpenCloud backend
// using the rclone CLI. The web-app-rclone-crypt plugin should then render
// the cleartext names back in the UI.
//
// Password / encoding settings match the PoC defaults hardcoded in
// `packages/web-app-rclone-crypt/src/resolveVault.ts`: password "foobar",
// no salt, base32 filename encoding.
const VAULT_PASSWORD = 'foobar'

function runRclone(args: string[]): string {
  const result = spawnSync('rclone', args, { encoding: 'utf8' })
  if (result.status !== 0) {
    throw new Error(
      `rclone ${args.join(' ')} failed (exit ${result.status}):\n` +
        `stdout: ${result.stdout}\nstderr: ${result.stderr}`
    )
  }
  return result.stdout
}

Given(
  '{string} creates an rclone-crypt vault {string} in personal space with the following content',
  async function (
    this: World,
    stepUser: string,
    vaultName: string,
    stepTable: DataTable
  ): Promise<void> {
    if (!vaultName.endsWith('.vault')) {
      throw new Error(
        `vault name "${vaultName}" must end with .vault — the plugin uses that suffix to detect vaults`
      )
    }

    const user = this.usersEnvironment.getUser({ key: stepUser })
    const workdir = mkdtempSync(join(tmpdir(), 'rclone-crypt-fixture-'))
    const configFile = join(workdir, 'rclone.conf')

    try {
      const obscuredPassword = runRclone(['obscure', VAULT_PASSWORD]).trim()
      const obscuredUserPassword = runRclone(['obscure', user.password]).trim()

      writeFileSync(
        configFile,
        [
          '[oc]',
          'type = webdav',
          `url = ${config.baseUrl}/dav/files/${user.username}`,
          'vendor = other',
          `user = ${user.username}`,
          `pass = ${obscuredUserPassword}`,
          '',
          '[oc-crypt]',
          'type = crypt',
          `remote = oc:${vaultName}`,
          `password = ${obscuredPassword}`,
          ''
        ].join('\n')
      )

      const baseFlags = ['--config', configFile, '--no-check-certificate']

      // Make reruns deterministic.
      const purge = spawnSync('rclone', [...baseFlags, 'purge', `oc:${vaultName}`], {
        encoding: 'utf8'
      })
      // Ignore exit status — first run won't have anything to purge.
      void purge

      runRclone([...baseFlags, 'mkdir', `oc-crypt:`])

      for (const row of stepTable.hashes()) {
        const localFile = join(workdir, `entry-${row.path.replace(/[^a-z0-9]/gi, '_')}`)
        writeFileSync(localFile, row.content ?? '')
        runRclone([...baseFlags, 'copyto', localFile, `oc-crypt:${row.path}`])
      }
    } finally {
      rmSync(workdir, { recursive: true, force: true })
    }
  }
)

Then(
  'the rclone-crypt vault {string} file {string} should decrypt to {string}',
  async function (
    this: World,
    vaultName: string,
    pathInVault: string,
    expectedContent: string
  ): Promise<void> {
    const user = this.usersEnvironment.getUser({ key: 'Admin' })
    const workdir = mkdtempSync(join(tmpdir(), 'rclone-crypt-check-'))
    const configFile = join(workdir, 'rclone.conf')
    try {
      const obscuredPassword = runRclone(['obscure', VAULT_PASSWORD]).trim()
      const obscuredUserPassword = runRclone(['obscure', user.password]).trim()
      writeFileSync(
        configFile,
        [
          '[oc]',
          'type = webdav',
          `url = ${config.baseUrl}/dav/files/${user.username}`,
          'vendor = other',
          `user = ${user.username}`,
          `pass = ${obscuredUserPassword}`,
          '',
          '[oc-crypt]',
          'type = crypt',
          `remote = oc:${vaultName}`,
          `password = ${obscuredPassword}`,
          ''
        ].join('\n')
      )
      const out = runRclone([
        '--config',
        configFile,
        '--no-check-certificate',
        'cat',
        `oc-crypt:${pathInVault}`
      ])
      expect(out.replace(/\n+$/, '')).toBe(expectedContent.replace(/\n+$/, ''))
    } finally {
      rmSync(workdir, { recursive: true, force: true })
    }
  }
)

When(
  '{string} enters the vault {string} with passphrase {string}',
  async function (
    this: World,
    stepUser: string,
    vaultName: string,
    passphrase: string
  ): Promise<void> {
    const { page } = this.actorsEnvironment.getActor({ key: stepUser })
    // Clicking the vault folder kicks the DriveResolver into a redirect to
    // /rclone-crypt/unlock — we wait for the unlock URL instead of for a
    // PROPFIND like the generic "opens folder" step does.
    await Promise.all([
      page.waitForURL((url) => url.pathname.includes('/rclone-crypt/unlock'), {
        timeout: 10_000
      }),
      page.locator(`[data-test-resource-name="${vaultName}"]`).first().click()
    ])
    await page.locator('input[type="password"]').fill(passphrase)
    await Promise.all([
      page.waitForURL((url) => !url.pathname.includes('/rclone-crypt/unlock'), {
        timeout: 10_000
      }),
      page.locator('#vault-unlock-submit').click()
    ])
  }
)

Then(
  '{string} should see the text editor content {string}',
  async function (this: World, stepUser: string, expectedContent: string): Promise<void> {
    const { page } = this.actorsEnvironment.getActor({ key: stepUser })
    const editor = page.locator('.text-editor-provider .ProseMirror')
    await editor.waitFor()
    await expect(editor).toHaveText(expectedContent)
  }
)

When(
  '{string} replaces the text editor content with {string}',
  async function (this: World, stepUser: string, newContent: string): Promise<void> {
    const { page } = this.actorsEnvironment.getActor({ key: stepUser })
    const editor = page.locator('.text-editor-provider .ProseMirror')
    await editor.waitFor()
    // ProseMirror only flips the doc dirty on real input events. type()
    // raises keydown but no beforeinput/input, which is what tiptap listens
    // for — insertText() simulates IME input which ProseMirror picks up.
    await editor.click()
    await page.keyboard.press('ControlOrMeta+A')
    await page.keyboard.press('Delete')
    await page.keyboard.insertText(newContent)
    await expect(editor).toHaveText(newContent)
  }
)

When(
  '{string} drag-drop uploads the following directory tree',
  async function (this: World, stepUser: string, stepTable: DataTable): Promise<void> {
    const { page } = this.actorsEnvironment.getActor({ key: stepUser })
    const workdir = mkdtempSync(join(tmpdir(), 'vault-folderupload-'))
    try {
      // Lay out the tree on disk; remember the top-level entries so we can
      // hand them to the drag-drop helper (it walks directories itself).
      const topLevel = new Set<string>()
      const expectedFiles: string[] = []
      for (const row of stepTable.hashes()) {
        const filePath = join(workdir, row.path)
        mkdirSync(dirname(filePath), { recursive: true })
        writeFileSync(filePath, row.content ?? '')
        const segments = row.path.split('/').filter(Boolean)
        topLevel.add(segments[0])
        expectedFiles.push(row.path)
      }

      const resources = Array.from(topLevel).map((name) => ({
        name,
        path: join(workdir, name)
      }))

      // dragDropFiles dispatches a drop event on #files-view with a
      // DataTransfer containing the whole tree (including webkitRelativePath).
      // Uppy / HandleUpload consume it like any other upload.
      const respPromise = page.waitForResponse(
        (resp) =>
          [201, 204].includes(resp.status()) &&
          ['POST', 'PUT', 'PATCH'].includes(resp.request().method())
      )
      await dragDropFiles(page, resources, '#files-view')
      await respPromise

      // Wait for the deepest cleartext leaf to surface in the listing so we
      // know the directoryTree creation + content uploads ran to completion.
      const leaf = expectedFiles[0].split('/').filter(Boolean)[0]
      await page.locator(`[data-test-resource-name="${leaf}"]`).first().waitFor({ timeout: 15_000 })
    } finally {
      rmSync(workdir, { recursive: true, force: true })
    }
  }
)

When(
  '{string} uploads a file named {string} with content {string} via the upload button',
  async function (this: World, stepUser: string, fileName: string, content: string): Promise<void> {
    const { page } = this.actorsEnvironment.getActor({ key: stepUser })
    const workdir = mkdtempSync(join(tmpdir(), 'vault-upload-'))
    const localFile = join(workdir, fileName)
    writeFileSync(localFile, content)
    try {
      const respPromise = page.waitForResponse(
        (resp) =>
          [201, 204].includes(resp.status()) &&
          ['POST', 'PUT', 'PATCH'].includes(resp.request().method())
      )
      // Same dance as the existing performUpload helper: open the FAB menu
      // first so the hidden input element actually accepts files.
      await page.locator('.oc-app-floating-action-button').click()
      await page.locator('#files-file-upload-input').setInputFiles(localFile)
      await respPromise
      await page.locator(`[data-test-resource-name="${fileName}"]`).waitFor({ timeout: 10_000 })
    } finally {
      rmSync(workdir, { recursive: true, force: true })
    }
  }
)

When(
  '{string} saves the text editor file',
  async function (this: World, stepUser: string): Promise<void> {
    const { page } = this.actorsEnvironment.getActor({ key: stepUser })
    // Ctrl+S in the editor area is consumed by tiptap before it can bubble
    // to the document-level keydown listener that drives saveFileTask. Open
    // the top-bar action menu and click "Save" instead — same handler, just
    // routed through the UI.
    await page.locator('#oc-openfile-contextmenu-trigger').click()
    // The dropdown rendering duplicates the action button (light + chrome
    // variants), so address the one inside the dropdown.
    const [putResponse] = await Promise.all([
      page.waitForResponse((resp) => resp.request().method() === 'PUT'),
      page.locator('#oc-openfile-contextmenu #app-save-action').click()
    ])
    if (!putResponse.ok()) {
      throw new Error(
        `PUT for save failed: ${putResponse.status()} ${putResponse.url()}\n` +
          (await putResponse.text())
      )
    }
  }
)
