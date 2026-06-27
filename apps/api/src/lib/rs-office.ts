import { RsOfficeClient, signChallenge, verifyJwt } from '@rumsan/user-sdk'

export interface RsOfficeUser {
  cuid: string
  name: string
  email: string
  active: boolean
  pending_approval: boolean
  org_unit?: string
  job_title?: string
  department?: string
  employment_type?: string
  created_at: string
}

export interface RsOfficeGoogleAuthResult {
  token: string
  user: RsOfficeUser
  roles: string[]
  google: {
    sub: string
    given_name?: string
    family_name?: string
    picture?: string
  }
}

export interface RsOfficeTokenPayload {
  sub: string
  app: string
  roles: string[]
  email: string
  org_unit?: string
  department?: string
  manager_cuid?: string
  iat: number
  exp: number
}

let cachedPublicKey: { baseUrl: string; publicKey: string } | null = null

function getClient(baseUrl: string): RsOfficeClient {
  return new RsOfficeClient({ baseUrl })
}

async function getPublicKey(baseUrl: string): Promise<string> {
  if (cachedPublicKey?.baseUrl === baseUrl) return cachedPublicKey.publicKey

  const { publicKey } = await getClient(baseUrl).auth.getPublicKey()
  cachedPublicKey = { baseUrl, publicKey }
  return publicKey
}

export async function googleLogin(
  idToken: string,
  appId: string,
  baseUrl: string,
  privateKeyHex?: string,
): Promise<RsOfficeGoogleAuthResult> {
  const client = getClient(baseUrl)
  const data: { id_token: string; challenge?: string; app_signature?: string } = { id_token: idToken }

  if (privateKeyHex) {
    const { challenge } = await client.auth.getChallenge({ appId })
    data.challenge = challenge
    data.app_signature = signChallenge(challenge, privateKeyHex)
  }

  return client.auth.googleLogin(data, { appId }) as Promise<RsOfficeGoogleAuthResult>
}

export async function refreshToken(
  token: string,
  baseUrl: string,
): Promise<string> {
  try {
    const result = await getClient(baseUrl).auth.refreshToken({ token })
    return result.token
  } catch {
    const err = new Error('Session expired') as Error & { status: number }
    err.status = 401
    throw err
  }
}

export interface RsOfficeAppUser {
  cuid: string
  name: string
  email: string
  active: boolean
  roles: string[]
}

export async function findAppUsers(
  token: string,
  appId: string,
  appEnvId: string,
  baseUrl: string,
): Promise<RsOfficeAppUser[]> {
  const url = `${baseUrl}/apps/${appId}/users?env_app_id=${appEnvId}`
  const res = await fetch(url, {
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
  })
  if (!res.ok) throw new Error('Failed to fetch app users from RS Office')
  const resData = (await res.json()) as { success: boolean; data: RsOfficeAppUser[] }
  return resData.data
}

export async function verifyToken(
  token: string,
  baseUrl: string,
): Promise<RsOfficeTokenPayload | null> {
  try {
    const publicKey = await getPublicKey(baseUrl)
    const result = await verifyJwt(token, publicKey)
    return result.valid ? (result.payload as RsOfficeTokenPayload) : null
  } catch {
    return null
  }
}
