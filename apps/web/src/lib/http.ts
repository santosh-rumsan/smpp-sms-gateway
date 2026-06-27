export async function getResponseError(
  res: Response,
  fallback: string,
): Promise<Error> {
  const contentType = res.headers.get('content-type') ?? ''

  if (contentType.includes('application/json')) {
    try {
      const data = (await res.json()) as { error?: string; message?: string }
      const message = data.error ?? data.message
      if (message) return new Error(message)
    } catch {
      // Fall back to plain text or the default message.
    }
  }

  try {
    const text = (await res.text()).trim()
    if (text) return new Error(text)
  } catch {
    // Ignore body read failures and fall back to the default message.
  }

  return new Error(fallback)
}
