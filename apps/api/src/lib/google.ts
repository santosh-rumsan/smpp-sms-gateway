export interface GoogleTokenResponse {
  access_token: string
  refresh_token?: string
  id_token?: string
  expires_in: number
  token_type: string
  scope: string
}

export async function exchangeCodeForTokens(
  code: string,
  clientId: string,
  clientSecret: string,
): Promise<GoogleTokenResponse> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: 'postmessage',
      grant_type: 'authorization_code',
    }),
  })

  if (!res.ok) {
    const error = await res.text()
    console.error('Google token exchange failed:', error)
    throw new Error('Failed to exchange authorization code')
  }

  return res.json() as Promise<GoogleTokenResponse>
}

export async function refreshAccessToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string,
): Promise<{ access_token: string; expires_in: number }> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
    }),
  })

  if (!res.ok) {
    const error = await res.text()
    console.error('Google token refresh failed:', error)
    throw new Error('Google token refresh failed')
  }

  return res.json() as Promise<{ access_token: string; expires_in: number }>
}

export interface GoogleContact {
  name: string
  phones: string[]
  photo?: string
  resourceName?: string
}

function normalizePhone(phone: string): string {
  const hasPlus = phone.startsWith('+')
  const digits = phone.replace(/\D/g, '')
  return hasPlus ? `+${digits}` : digits
}

export async function fetchGoogleContacts(accessToken: string): Promise<GoogleContact[]> {
  const contacts: GoogleContact[] = []
  let nextPageToken: string | undefined

  do {
    const url = new URL('https://people.googleapis.com/v1/people/me/connections')
    url.searchParams.set('personFields', 'names,phoneNumbers,photos')
    url.searchParams.set('pageSize', '1000')
    if (nextPageToken) url.searchParams.set('pageToken', nextPageToken)

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    })

    if (res.status === 401) throw new Error('Google token expired')
    if (!res.ok) break

    const data = (await res.json()) as {
      connections?: Array<{
        resourceName?: string
        names?: Array<{ displayName?: string }>
        phoneNumbers?: Array<{ value?: string }>
        photos?: Array<{ url?: string; default?: boolean }>
      }>
      nextPageToken?: string
    }

    for (const person of data.connections ?? []) {
      const name = person.names?.[0]?.displayName
      const phones = (person.phoneNumbers ?? [])
        .map((p) => (p.value ? normalizePhone(p.value) : ''))
        .filter((v) => v.length > 0)
      const photo = person.photos?.find((p) => !p.default)?.url
      const resourceName = person.resourceName

      if (name && phones.length > 0) {
        contacts.push({ name, phones, photo, resourceName })
      }
    }

    nextPageToken = data.nextPageToken
  } while (nextPageToken)

  return contacts
}
