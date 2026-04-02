import type {
  ChatMessage,
  ChatResponse,
  EventItem,
  RecommendationsResponse,
  TokenResponse,
  User,
} from './types'

export const API_URL = import.meta.env.VITE_API_URL?.replace(/\/$/, '') || ''

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  })

  if (response.status === 204) {
    return undefined as T
  }

  const rawText = await response.text()

  let parsed: unknown = null
  if (rawText) {
    try {
      parsed = JSON.parse(rawText)
    } catch {
      parsed = rawText
    }
  }

  if (!response.ok) {
    let detail = 'Ошибка запроса'

    if (parsed && typeof parsed === 'object' && 'detail' in parsed) {
      detail = String((parsed as { detail?: unknown }).detail ?? detail)
    } else if (typeof parsed === 'string' && parsed.trim()) {
      detail = parsed
    } else if (parsed != null) {
      detail = JSON.stringify(parsed)
    }

    throw new Error(detail)
  }

  return parsed as T
}

export async function register(payload: {
  email: string
  name: string
  password: string
  role: string
}): Promise<TokenResponse> {
  return request('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function login(payload: {
  email: string
  password: string
}): Promise<TokenResponse> {
  return request('/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function getMe(token: string): Promise<User> {
  return request('/auth/me', {
    headers: { Authorization: `Bearer ${token}` },
  })
}

export async function updateMe(token: string, payload: { name?: string; region?: string | null }): Promise<User> {
  return request('/auth/me', {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  })
}

export async function createEvent(
  token: string,
  payload: {
    title: string
    event_date?: string | null
    budget?: number | null
    guests_count?: number | null
    format?: string | null
    notes?: string | null
    guest_emails?: string[] | null
    city?: string | null
    status?: string | null
    venue_mode?: string | null
    selected_option?: string | null
    selected_option_kind?: string | null
  },
): Promise<EventItem> {
  return request('/events', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  })
}

export async function listEvents(token: string): Promise<EventItem[]> {
  return request('/events', {
    headers: { Authorization: `Bearer ${token}` },
  })
}

export async function getEvent(token: string, eventId: number): Promise<EventItem> {
  return request(`/events/${eventId}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
}