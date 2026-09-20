/**
 * Central API service — all data through MongoDB backend.
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

const getToken = () => localStorage.getItem('authToken');

const headers = (extra: Record<string, string> = {}) => ({
  'Content-Type': 'application/json',
  ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
  ...extra,
});

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const controller = new AbortController();
  const timeout    = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(`${API_URL}${path}`, {
      ...options,
      signal: controller.signal,
      headers: { ...headers(), ...(options.headers as Record<string, string> || {}) },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || `Request failed: ${path}`);
    return data as T;
  } catch (err: any) {
    if (err.name === 'AbortError') throw new Error('Request timed out');
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

// ── Tournaments ──────────────────────────────────────────────────────────────

export const TournamentAPI = {
  getAll: (status?: string) =>
    request<any[]>(`/tournaments${status ? `?status=${status}` : ''}`),

  getById: (id: string) =>
    request<any>(`/tournaments/${id}`),

  create: (data: object) =>
    request<any>('/tournaments', { method: 'POST', body: JSON.stringify(data) }),

  update: (id: string, data: object) =>
    request<any>(`/tournaments/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  delete: (id: string) =>
    request<any>(`/tournaments/${id}`, { method: 'DELETE' }),

  getParticipants: (id: string) =>
    request<any[]>(`/tournaments/${id}/participants`),

  addParticipant: (id: string, data: object) =>
    request<any>(`/tournaments/${id}/participants`, { method: 'POST', body: JSON.stringify(data) }),

  generateDraw: (id: string) =>
    request<any>(`/tournaments/${id}/draw`, { method: 'POST' }),

  getBracket: (id: string) =>
    request<any[]>(`/tournaments/${id}/bracket`),

  recordResult: (id: string, bracketMatchId: string, winnerParticipantId: string) =>
    request<any>(`/tournaments/${id}/result`, {
      method: 'POST',
      body: JSON.stringify({ bracketMatchId, winnerParticipantId }),
    }),

  getMatches: (id: string) =>
    request<any[]>(`/tournaments/${id}/matches`),

  getStandings: (id: string) =>
    request<any[]>(`/tournaments/${id}/standings`),

  closeRegistration: (id: string) =>
    request<any>(`/tournaments/${id}/close-registration`, { method: 'POST' }),
};

// ── Matches ──────────────────────────────────────────────────────────────────

export const MatchAPI = {
  getAll: (status?: string) =>
    request<any[]>(`/matches${status ? `?status=${status}` : ''}`),

  getById: async (id: string) => {
    try {
      return await request<any>(`/matches/${id}`);
    } catch {
      // Local match (created offline)
      const local = localStorage.getItem(id);
      if (local) return JSON.parse(local);
      throw new Error('Match not found');
    }
  },

  create: (data: object) =>
    request<any>('/matches', { method: 'POST', body: JSON.stringify(data) }),

  start: (id: string) =>
    request<any>(`/matches/${id}/start`, { method: 'POST' }),

  scorePoint: (id: string, side: 1 | 2, action = 'point') =>
    request<{ match: any; gameCompleted: boolean; matchCompleted: boolean }>(
      `/matches/${id}/score`,
      { method: 'POST', body: JSON.stringify({ side, action }) }
    ),

  undo: (id: string) =>
    request<any>(`/matches/${id}/undo`, { method: 'POST' }),

  end: (id: string) =>
    request<any>(`/matches/${id}/end`, { method: 'POST' }),

  delete: (id: string) =>
    request<any>(`/matches/${id}`, { method: 'DELETE' }),
};

// ── Users ────────────────────────────────────────────────────────────────────

export const UserAPI = {
  getAll: () => request<any[]>('/users'),
  getById: (id: string) => request<any>(`/users/${id}`),
  getStats: (id: string) => request<any>(`/users/${id}/stats`),
  getRankings: (scope: 'world' | 'state' = 'world', state?: string, district?: string) =>
    request<any[]>(`/users/rankings?scope=${scope}${state ? `&state=${encodeURIComponent(state)}` : ''}${district ? `&district=${encodeURIComponent(district)}` : ''}`),
  getH2H: (aId: string, bId: string) =>
    request<any>(`/users/h2h?a=${encodeURIComponent(aId)}&b=${encodeURIComponent(bId)}`),
};

// ── Entity Autocomplete ───────────────────────────────────────────────────────

export const EntityAPI = {
  search: (type: 'city' | 'venue' | 'club' | 'university', q: string) =>
    request<any[]>(`/entities?type=${type}&q=${encodeURIComponent(q)}`),

  create: (type: 'city' | 'venue' | 'club' | 'university', name: string, extra?: { state?: string; city?: string }) =>
    request<any>('/entities', { method: 'POST', body: JSON.stringify({ type, name, ...extra }) }),
};

// ── Analytics ────────────────────────────────────────────────────────────────

export const AnalyticsAPI = {
  getStats: () =>
    request<{ athletes: number; tourneys: number; participants: number }>('/analytics/stats'),
};
