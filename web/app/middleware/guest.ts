export default defineNuxtRouteMiddleware(async () => {
  if (import.meta.server) return
  const auth = useAuthStore()
  await auth.init()
  if (auth.isAuthenticated) return navigateTo('/')
})
