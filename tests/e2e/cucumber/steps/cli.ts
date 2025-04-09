import { Given, DataTable } from '@cucumber/cucumber'
import { World } from '../environment'
import { execSync } from 'child_process'

Given(
  '{string} creates following file(s) using CLI:',
  function (this: World, stepUser: string, stepTable: DataTable) {
    const id = this.usersEnvironment.getCreatedUser({ key: stepUser }).uuid

    const containerIdOrName = process.env.CONTAINER_NAME ?? 'web_oc'
    const storagePath = `/var/lib/opencloud/storage/users/users/${id}`

    for (const info of stepTable.hashes()) {
      const setupCommand = `docker exec -w ${storagePath} ${containerIdOrName} dd if=/dev/zero of=${info.resource} bs=1M count=${info.size} && sync`
      console.log(
        `[Setup] Creating test file ${storagePath}/${info.resource} in container '${containerIdOrName}'...`
      )
      try {
        execSync(setupCommand, { stdio: 'inherit', timeout: 10000 })
      } catch (error) {
        throw new Error(`Failed to create test file, aborting tests: ${error.message}`)
      }
    }
  }
)
