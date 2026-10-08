/** Pages that need a session; the session exists only in the browser. */
export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server) return
  const auth = useAuthStore()
  await auth.init()
  if (!auth.isAuthenticated) return navigateTo({ path: '/login', query: { redirect: to.fullPath } })
})
