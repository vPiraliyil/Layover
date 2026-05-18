import supabase from './supabase'

export class APIError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = 'APIError'
  }
}

export async function fetchAPI<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  let { data: { session } } = await supabase.auth.getSession()

  if (session && session.expires_at && session.expires_at < Math.floor(Date.now() / 1000)) {
    console.log('[api] session expired, refreshing...')
    const { data } = await supabase.auth.refreshSession()
    session = data.session
  }

  console.log(`[api] ${options.method ?? 'GET'} ${path} | session:`, session ? `found (user: ${session.user?.email}, expires_at: ${session.expires_at})` : 'null — sending unauthenticated')

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> ?? {}),
  }

  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`
  }

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}${path}`,
    { ...options, headers }
  )

  if (!res.ok) {
    const body = await res.text()
    console.error(`[api] ${res.status} on ${path}:`, body)
    throw new APIError(res.status, body)
  }

  return res.json() as Promise<T>
}
