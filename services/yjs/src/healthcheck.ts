import { parsePositiveInt } from './lib/env.ts'
import { checkReadinessEndpoint, checkWebSocketEndpoint } from './lib/healthcheck.ts'

let port: number
try {
  port = parsePositiveInt('PORT', 1234)
} catch (e: unknown) {
  console.error(e instanceof Error ? e.message : e)
  process.exit(1)
}

async function main(): Promise<void> {
  await checkReadinessEndpoint(port)
  await checkWebSocketEndpoint(port)
}

main().catch((error: unknown) => {
  console.error('[healthcheck] failed:', error)
  process.exit(1)
})
