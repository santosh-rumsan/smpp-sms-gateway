import type { AppDb } from './lib/db'

export interface HonoBindings {
  DB: D1Database
  RS_OFFICE_APP_ID: string
  RS_OFFICE_APP_ENV_ID: string
  RS_OFFICE_URL: string
  RS_OFFICE_APP_PRIVATE_KEY?: string
  EMAIL_FORWARD_API_URL?: string
  EMAIL_FORWARD_FROM_NAME?: string
  GOOGLE_CLIENT_ID: string
  GOOGLE_CLIENT_SECRET: string
}

export interface HonoVariables {
  db: AppDb
  user: {
    id: string
    name: string
    email: string
    role: string
    image?: string | null
  }
}

export type HonoEnv = {
  Bindings: HonoBindings
  Variables: HonoVariables
}
