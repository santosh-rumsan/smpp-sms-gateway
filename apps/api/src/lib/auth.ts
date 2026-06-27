import { verifyToken } from './rs-office'

export interface AuthenticatedUser {
  id: string
  name: string
  email: string
  role: string
  image?: string | null
}

export function getBearerToken(headers: Headers): string | null {
  const authorization = headers.get('authorization')
  if (!authorization) return null

  const [scheme, token] = authorization.split(' ')
  if (scheme?.toLowerCase() !== 'bearer' || !token) return null

  return token
}

export function extractAppRole(roles: string[], appId: string): string {
  const matched: string[] = []
  for (const role of roles) {
    const [prefix, name] = role.split('|')
    if (prefix === appId && name) matched.push(name)
  }
  return matched.length > 0 ? matched.join(',') : 'rsuser'
}

export async function verifyAppToken(
  token: string,
  rsOfficeUrl: string,
): Promise<AuthenticatedUser | null> {
  const payload = await verifyToken(token, rsOfficeUrl)
  if (!payload) return null

  return {
    id: payload.sub,
    name: payload.email,
    email: payload.email,
    role: extractAppRole(payload.roles, payload.app),
    image: null,
  }
}
