import { hc } from 'hono/client'
import type { AppType } from '../../../apps/api/src/index'

let _baseUrl = 'http://localhost:6061'
let _getAccessToken: (() => string | null | Promise<string | null>) | undefined

export function configureSDK(opts: {
  baseUrl: string
  getAccessToken?: () => string | null | Promise<string | null>
}) {
  _baseUrl = opts.baseUrl
  _getAccessToken = opts.getAccessToken
}

export function getSDKBaseUrl() {
  return _baseUrl
}

export function createApiClient(
  baseUrl?: string,
  opts?: {
    getAccessToken?: () => string | null | Promise<string | null>
  },
) {
  return hc<AppType>(baseUrl ?? _baseUrl, {
    fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
      const token = await (opts?.getAccessToken ?? _getAccessToken)?.()
      const headers = new Headers(init?.headers)

      if (token) {
        headers.set('Authorization', `Bearer ${token}`)
      }

      return fetch(input, { ...init, headers })
    },
  })
}

export type ApiClient = ReturnType<typeof createApiClient>

export * from './types'
