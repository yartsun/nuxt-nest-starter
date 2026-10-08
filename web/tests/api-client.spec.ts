import { describe, expect, it, vi } from 'vitest'
import { createApiClient, messageOf } from '../app/utils/api-client'

const unauthorized = Object.assign(new Error('401'), { status: 401 })

function setup(responses: unknown[], refreshResult = true) {
  let token: string | null = 'old'
  const calls: { path: string, headers: Record<string, string> }[] = []
  const fetch = vi.fn(async (path: string, options: Record<string, unknown>) => {
    calls.push({ path, headers: options.headers as Record<string, string> })
    const next = responses.shift()
    if (next instanceof Error) throw next
    return next
  })
  const refresh = vi.fn(async () => {
    if (refreshResult) token = 'new'
    return refreshResult
  })
  const api = createApiClient({ baseURL: () => 'http://api', fetch: fetch as never, getToken: () => token, refresh })
  return { api, calls, refresh, setToken: (value: string | null) => (token = value) }
}

describe('createApiClient', () => {
  it('sends the bearer token', async () => {
    const { api, calls } = setup([{ ok: true }])
    await expect(api('/items')).resolves.toEqual({ ok: true })
    expect(calls[0].headers.Authorization).toBe('Bearer old')
  })

  it('refreshes once on 401 and retries with the new token', async () => {
    const { api, calls, refresh } = setup([unauthorized, { ok: true }])
    await expect(api('/items')).resolves.toEqual({ ok: true })
    expect(refresh).toHaveBeenCalledTimes(1)
    expect(calls.map(call => call.headers.Authorization)).toEqual(['Bearer old', 'Bearer new'])
  })

  it('gives up when the refresh fails or the retry is still 401', async () => {
    const failing = setup([unauthorized], false)
    await expect(failing.api('/items')).rejects.toBe(unauthorized)
    const stubborn = setup([unauthorized, unauthorized])
    await expect(stubborn.api('/items')).rejects.toBe(unauthorized)
    expect(stubborn.refresh).toHaveBeenCalledTimes(1)
  })

  it('does not try to refresh anonymous requests or other errors', async () => {
    const anonymous = setup([unauthorized])
    anonymous.setToken(null)
    await expect(anonymous.api('/items')).rejects.toBe(unauthorized)
    expect(anonymous.refresh).not.toHaveBeenCalled()
    const serverError = setup([Object.assign(new Error('500'), { status: 500 })])
    await expect(serverError.api('/items')).rejects.toThrow('500')
    expect(serverError.refresh).not.toHaveBeenCalled()
  })

  it('formats validation messages', () => {
    expect(messageOf({ data: { message: ['name is too long', 'price must be positive'] } })).toBe('name is too long. price must be positive')
    expect(messageOf(new Error('x'), 'Fallback')).toBe('Fallback')
  })
})
