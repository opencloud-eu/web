export const READY_PATH = '/healthz/ready'
export const LOCALHOST = '127.0.0.1'
export const TIMEOUT_MS = 5000

export async function checkReadinessEndpoint(port: number): Promise<void> {
  const url = `http://${LOCALHOST}:${port}${READY_PATH}`
  const res = await fetch(url, {
    signal: AbortSignal.timeout(TIMEOUT_MS)
  })

  if (!res.ok) {
    throw new Error(`readiness endpoint returned ${res.status}`)
  }
}

export async function checkWebSocketEndpoint(port: number): Promise<void> {
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
