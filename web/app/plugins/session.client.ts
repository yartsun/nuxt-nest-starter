export default defineNuxtPlugin(async () => {
  const auth = useAuthStore()
  await auth.init()
  const realtime = useRealtime()
  realtime.client()
  watch(() => auth.user?.id, () => realtime.reconnect())
})
