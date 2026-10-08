import { createApiClient } from '~/utils/api-client'

export function useApi() {
  const auth = useAuthStore()
  const config = useRuntimeConfig()
  return createApiClient({
    baseURL: () => (import.meta.server ? config.apiBaseServer || config.public.apiBase : config.public.apiBase),
    fetch: $fetch as never,
    getToken: () => auth.accessToken,
    refresh: () => auth.refresh(),
  })
}
