const port = parseInt(process.env.PORT ?? '1234', 10)
const READY_PATH = '/healthz/ready'
const LOCALHOST = '127.0.0.1'
const TIMEOUT_MS = 5000

if (!Number.isInteger(port) || port <= 0) {
  console.error(`invalid PORT=${JSON.stringify(process.env.PORT)}`)
  process.exit(1)
}

async function checkReadinessEndpoint(): Promise<void> {
  const url = `http://${LOCALHOST}:${port}${READY_PATH}`
  const res = await fetch(url, {
    signal: AbortSignal.timeout(TIMEOUT_MS)
  })

  if (!res.ok) {
    throw new Error(`readiness endpoint returned ${res.status}`)
  }
}

async function checkWebSocketEndpoint(): Promise<void> {
  const url = `ws://${LOCALHOST}:${port}`
  await new Promise<void>((resolve, reject) => {
    const ws = new WebSocket(url)
    let opened = false

    const timer = setTimeout(() => {
      cleanup()
      ws.close()
      reject(new Error('websocket handshake timed out'))
    }, TIMEOUT_MS)

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
