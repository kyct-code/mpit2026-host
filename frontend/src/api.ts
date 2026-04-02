import type {
  ChatMessage,
  ChatResponse,
  EventItem,
  RecommendationsResponse,
  TokenResponse,
  User,
} from './types'

const rawApiUrl = import.meta.env.VITE_API_URL
export const API_URL = rawApiUrl?.replace(/\/$/, '')

if (!API_URL) {
  throw new Error('VITE_API_URL is not set in Vercel environment variables')
}

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

export async function updateMe(
  token: string,
  payload: { name?: string; region?: string | null },
): Promise<User> {
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

export async function updateEvent(
  token: string,
  eventId: number,
  payload: {
    title?: string | null
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
  return request(`/events/${eventId}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  })
}

export async function getChatHistory(token: string, eventId: number): Promise<ChatMessage[]> {
  return request(`/chat/events/${eventId}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
}

export async function sendChatMessage(
  token: string,
  eventId: number,
  message: string,
): Promise<ChatResponse> {
  return request(`/chat/events/${eventId}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ message }),
  })
}

export async function getEventRecommendations(
  token: string,
  eventId: number,
  options?: { city?: string; limit?: number },
): Promise<RecommendationsResponse> {
  const params = new URLSearchParams()

  if (options?.city?.trim()) {
    params.set('city', options.city.trim())
  }

  if (options?.limit) {
    params.set('limit', String(options.limit))
  }

  const suffix = params.toString() ? `?${params.toString()}` : ''

  return request(`/events/${eventId}/recommendations${suffix}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
}