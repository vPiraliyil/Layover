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
  console.log('[api] base URL:', process.env.NEXT_PUBLIC_API_URL, '| path:', path)
  const { data: { session } } = await supabase.auth.getSession()

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
    throw new APIError(res.status, body)
  }

  return res.json() as Promise<T>
}
