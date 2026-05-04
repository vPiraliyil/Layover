export interface Airport {
  id: string
  iata_code: string
  name: string
  city: string
  terminal_count: number
  created_at: string
}

export interface POI {
  id: string
  airport_id: string
  name: string
  category: 'food' | 'drink' | 'shopping' | 'lounge' | 'gate' | 'other'
  terminal: string | null
  gate_area: string | null
  lat: number | null
  lng: number | null
  meta: Record<string, unknown> | null
  created_at: string
}

export interface ItineraryStop {
  stop_number: number
  name: string
  category: string
  description: string
  duration_minutes: number
  lat: number
  lng: number
  walking_minutes_to_next: number
}

export interface Itinerary {
  id: string
  user_id: string
  airport_id: string
  layover_duration_minutes: number
  stops: ItineraryStop[]
  created_at: string
  updated_at: string
}

export interface ChatMessage {
  id: string
  itinerary_id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}
