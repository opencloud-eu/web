import { When } from '../../environment/fixtures'
import { DataTable } from 'playwright-bdd'
import path from 'path'
import { World } from '../../environment/world'
import { objects } from '../../support'
import { appConfig } from '../../playwright.config'
import * as runtimeFs from '../../support/utils/runtimeFs'
import { pageObjectFor } from '../../environment/pageObject'

When(
  '{string} uploads the following resource(s)',
  async ({ world }: { world: World }, stepUser: string, stepTable: DataTable): Promise<void> => {
    const resourceObject = pageObjectFor(world, stepUser, objects.applicationFiles.Resource)
    for (const info of stepTable.hashes()) {
      await resourceObject.upload({
        to: info.to,
        resources: [world.filesEnvironment.getFile({ name: info.resource })],
        option: info.option,
        type: info.type,
        password: info.password
      })
    }
  }
)

When(
  '{string} tries to upload the following resource',
  async ({ world }: { world: World }, stepUser: string, stepTable: DataTable): Promise<void> => {
    const resourceObject = pageObjectFor(world, stepUser, objects.applicationFiles.Resource)
    for (const info of stepTable.hashes()) {
      await resourceObject.tryToUpload({
        to: info.to,
        resources: [world.filesEnvironment.getFile({ name: info.resource })],
        error: info.error
      })
    }
  }
)

When(
  '{string} starts uploading the following large resource(s) from the temp upload directory',
  async ({ world }: { world: World }, stepUser: string, stepTable: DataTable): Promise<void> => {
    const resourceObject = pageObjectFor(world, stepUser, objects.applicationFiles.Resource)
    for (const info of stepTable.hashes()) {
      await resourceObject.startUpload({
        to: info.to,
        resources: [
          world.filesEnvironment.getFile({
            name: path.join(
              runtimeFs.getTempUploadPath().replace(appConfig.assetsPath, ''),
              info.resource
            )
          })
        ],
        option: info.option
      })
    }
  }
)

When(
  '{string} {word} the file upload',
  async ({ world }: { world: World }, stepUser: string, action: string): Promise<void> => {
    const resourceObject = pageObjectFor(world, stepUser, objects.applicationFiles.Resource)
    switch (action) {
      case 'pauses':
        await resourceObject.pauseUpload()
        break
      case 'resumes':
        await resourceObject.resumeUpload()
        break
      case 'cancels':
        await resourceObject.cancelUpload()
        break
      default:
        throw new Error(`Unknown action: ${action}`)
    }
  }
)

When(
  '{string} uploads the following resource(s) via drag-n-drop',
  async ({ world }: { world: World }, stepUser: string, stepTable: DataTable): Promise<void> => {
    const resourceObject = pageObjectFor(world, stepUser, objects.applicationFiles.Resource)
    const resources = stepTable
      .hashes()
      .map((item) => world.filesEnvironment.getFile({ name: item.resource }))
    await resourceObject.dropUpload({ resources, password: stepTable.hashes()[0].password })
  }
)

When(
  '{string} uploads {int} small files in personal space',
  async ({ world }: { world: World }, stepUser: string, numberOfFiles: number): Promise<void> => {
    const files = []
    for (let i = 0; i < numberOfFiles; i++) {
      const file = `file${i}.txt`
      runtimeFs.createFile(file, 'test content')

      files.push(
        world.filesEnvironment.getFile({
          name: path.join(runtimeFs.getTempUploadPath().replace(appConfig.assetsPath, ''), file)
        })
      )
    }

    const resourceObject = pageObjectFor(world, stepUser, objects.applicationFiles.Resource)

    await resourceObject.uploadLargeNumberOfResources({ resources: files })
  }
)

When(
  '{string} uploads an image from the clipboard',
  async ({ world }: { world: World }, stepUser: string) => {
    const resourceObject = pageObjectFor(world, stepUser, objects.applicationFiles.Resource)
    await resourceObject.uploadImageFromClipboard()
  }
)
