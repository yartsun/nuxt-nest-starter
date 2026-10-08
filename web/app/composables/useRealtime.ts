import { io, type Socket } from 'socket.io-client'

let socket: Socket | null = null

/**
 * One Socket.IO connection per tab. The access token goes in the handshake
 * `auth` payload (not the URL) and is re-read on every reconnect.
 */
export function useRealtime() {
  const connected = useState('realtime:connected', () => false)
  const auth = useAuthStore()
  const config = useRuntimeConfig()

  function client(): Socket | null {
    if (import.meta.server) return null
    if (!socket) {
      socket = io(`${config.public.apiBase}/realtime`, {
        transports: ['websocket'],
        auth: callback => callback(auth.accessToken ? { token: auth.accessToken } : {}),
      })
      socket.on('connect', () => (connected.value = true))
      socket.on('disconnect', () => (connected.value = false))
    }
    return socket
  }

  /** Subscribe for the lifetime of the calling component. */
  function on<T>(event: string, handler: (payload: T) => void) {
    const current = client()
    if (!current) return
    current.on(event, handler)
    if (getCurrentScope()) onScopeDispose(() => current.off(event, handler))
  }

  /** Reconnect after sign-in or sign-out so the server re-evaluates the private room. */
  function reconnect() {
    const current = client()
    current?.disconnect()
    current?.connect()
  }

  return { connected, client, on, reconnect }
}
