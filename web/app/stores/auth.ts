import { defineStore } from 'pinia'
import { messageOf } from '~/utils/api-client'
import type { Session, User } from '~/utils/types'

/**
 * The access token lives only in memory; the refresh token is an httpOnly
 * cookie the page cannot read. A reload restores the session through /auth/refresh.
 */
export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const accessToken = ref<string | null>(null)
  const ready = ref(false)
  const config = useRuntimeConfig()
  let inflight: Promise<boolean> | null = null

  const post = <T>(path: string, body?: Record<string, unknown>) =>
    $fetch<T>(path, { baseURL: config.public.apiBase, method: 'POST', body, credentials: 'include' })

  function apply(session: Session) {
    user.value = session.user
    accessToken.value = session.accessToken
  }

  function clear() {
    user.value = null
    accessToken.value = null
  }

  async function exchange(): Promise<boolean> {
    try {
      apply(await post<Session>('/auth/refresh'))
      return true
    }
    catch (error) {
      // Another tab rotated the cookie a moment ago; the browser already holds the new one.
      if (messageOf(error, '').includes('just rotated')) {
        await new Promise(resolve => setTimeout(resolve, 300))
        return exchange()
      }
      clear()
      return false
    }
  }

  /** One refresh at a time, shared by every caller that hits a 401. */
  function refresh(): Promise<boolean> {
    inflight ??= exchange().finally(() => (inflight = null))
    return inflight
  }

  async function login(email: string, password: string) {
    apply(await post<Session>('/auth/login', { email, password }))
  }

  async function register(name: string, email: string, password: string) {
    apply(await post<Session>('/auth/register', { name, email, password }))
  }

  async function logout() {
    await post('/auth/logout').catch(() => undefined)
    clear()
  }

  async function init() {
    if (ready.value) return
    await refresh()
    ready.value = true
  }

  return { user, accessToken, ready, isAuthenticated: computed(() => Boolean(user.value)), refresh, login, register, logout, init }
})
