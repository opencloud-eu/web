const port = parseInt(process.env.PORT ?? '1234', 10)
const host = process.env.HEALTHCHECK_HOST ?? '127.0.0.1'
const readyPath = process.env.HEALTHCHECK_READY_PATH ?? '/healthz/ready'
const timeoutMs = parseInt(process.env.HEALTHCHECK_TIMEOUT_MS ?? '5000', 10)

if (!Number.isInteger(port) || port <= 0) {
  console.error(`invalid PORT=${JSON.stringify(process.env.PORT)}`)
  process.exit(1)
}

if (!Number.isInteger(timeoutMs) || timeoutMs <= 0) {
  console.error(
    `invalid HEALTHCHECK_TIMEOUT_MS=${JSON.stringify(process.env.HEALTHCHECK_TIMEOUT_MS)}`
  )
  process.exit(1)
}

async function checkReadinessEndpoint(): Promise<void> {
  const url = `http://${host}:${port}${readyPath}`
  const res = await fetch(url, {
    signal: AbortSignal.timeout(timeoutMs)
  })

  if (!res.ok) {
    throw new Error(`readiness endpoint returned ${res.status}`)
  }
}

async function checkWebSocketEndpoint(): Promise<void> {
  const url = `ws://${host}:${port}`
  await new Promise<void>((resolve, reject) => {
    const ws = new WebSocket(url)
    let opened = false

    const timer = setTimeout(() => {
      cleanup()
      ws.close()
      reject(new Error('websocket handshake timed out'))
    }, timeoutMs)

    function cleanup(): void {
      clearTimeout(timer)
      ws.removeEventListener('open', onOpen)
      ws.removeEventListener('error', onError)
      ws.removeEventListener('close', onClose)
    }

    function onOpen(): void {
      opened = true
      cleanup()
      ws.close(1000, 'healthcheck')
      resolve()
    }

    function onError(): void {
      cleanup()
      reject(new Error('websocket endpoint is not reachable'))
    }

    function onClose(): void {
      if (opened) {
        return
      }
      cleanup()
      reject(new Error('websocket closed before handshake completed'))
    }

    ws.addEventListener('open', onOpen)
    ws.addEventListener('error', onError)
    ws.addEventListener('close', onClose)
  })
}

async function main(): Promise<void> {
  await checkReadinessEndpoint()
  await checkWebSocketEndpoint()
}

main().catch((error: unknown) => {
  console.error('[healthcheck] failed:', error)
  process.exit(1)
})
