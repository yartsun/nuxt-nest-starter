export interface FetchError {
  status?: number
  statusCode?: number
  data?: { message?: string | string[] }
}

type Fetcher = <T>(path: string, options: Record<string, unknown>) => Promise<T>

interface ClientOptions {
  baseURL: () => string
  fetch: Fetcher
  getToken: () => string | null
  refresh: () => Promise<boolean>
}

export const statusOf = (error: unknown) => (error as FetchError)?.status ?? (error as FetchError)?.statusCode

/** Human-readable message from an API error, including class-validator arrays. */
export function messageOf(error: unknown, fallback = 'Something went wrong'): string {
  const message = (error as FetchError)?.data?.message
  if (Array.isArray(message)) return message.join('. ')
  return message || fallback
}

/**
 * Adds the access token and, on a 401, refreshes the session once and retries.
 * Concurrent 401s share the store's single in-flight refresh.
 */
export function createApiClient(options: ClientOptions) {
  return async function api<T>(path: string, init: Record<string, unknown> = {}): Promise<T> {
    const send = () => {
      const token = options.getToken()
      const headers = { ...(init.headers as Record<string, string> | undefined), ...(token ? { Authorization: `Bearer ${token}` } : {}) }
      return options.fetch<T>(path, { ...init, baseURL: options.baseURL(), headers })
    }
    try {
      return await send()
    }
    catch (error) {
      if (statusOf(error) !== 401 || !options.getToken() || !(await options.refresh())) throw error
      return send()
    }
  }
}
