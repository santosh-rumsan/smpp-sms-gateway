import { createDb } from '@rs/db'

export function getDb(d1: D1Database) {
  return createDb(d1)
}

export type AppDb = ReturnType<typeof getDb>
