import { createApiClient } from '@rs/sdk'

import { getAccessToken } from './auth-client'

export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:6061'

export const api = createApiClient(API_URL, {
  getAccessToken,
})
