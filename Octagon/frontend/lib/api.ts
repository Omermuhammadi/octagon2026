// API configuration and helper functions

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';

interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: Array<{ msg: string; path: string }>;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  count?: number;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: unknown;
  token?: string | null;
}

class ApiError extends Error {
  status: number;
  errors?: Array<{ msg: string; path: string }>;

  constructor(message: string, status: number, errors?: Array<{ msg: string; path: string }>) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errors = errors;
  }
}

async function apiRequest<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<ApiResponse<T>> {
  const { method = 'GET', body, token } = options;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

  const config: RequestInit = {
    method,
    headers,
    credentials: 'include',
    signal: controller.signal,
  };

  if (body && method !== 'GET') {
    config.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    clearTimeout(timeoutId);
    const data: ApiResponse<T> = await response.json();

    if (!response.ok) {
      throw new ApiError(
        data.message || 'An error occurred',
        response.status,
        data.errors
      );
    }

    return data;
  } catch (error: unknown) {
    clearTimeout(timeoutId);
    if (error instanceof ApiError) throw error;
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ApiError('Request timed out. Please check your connection.', 408);
    }
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new ApiError('Unable to connect to server. Please try again later.', 0);
    }
    throw error;
  }
}

// Auth API functions
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  role: 'coach' | 'fan' | 'fighter' | 'beginner';
}

export interface UserData {
  id: string;
  name: string;
  email: string;
  role: 'coach' | 'fan' | 'fighter' | 'beginner';
  avatar?: string;
  joinDate: string;
  experienceLevel?: 'Beginner' | 'Intermediate' | 'Advanced' | 'Professional';
  trainingGoal?: 'Self-Defense' | 'Fitness' | 'Competition Preparation' | 'Professional Fighting';
  discipline?: 'MMA' | 'BJJ' | 'Muay Thai' | 'Boxing' | 'Karate' | 'Wrestling';
  weight?: string;
  height?: string;
  ageGroup?: 'under-15' | '15-25' | '25+';
  location?: string;
  // Stats (returned as individual fields)
  predictionsMade?: number;
  trainingSessions?: number;
  accuracyRate?: number;
  daysActive?: number;
}

export interface ProfileUpdateData {
  name?: string;
  avatar?: string;
  experienceLevel?: 'Beginner' | 'Intermediate' | 'Advanced' | 'Professional';
  trainingGoal?: 'Self-Defense' | 'Fitness' | 'Competition Preparation' | 'Professional Fighting';
  discipline?: 'MMA' | 'BJJ' | 'Muay Thai' | 'Boxing' | 'Karate' | 'Wrestling';
  weight?: string;
  height?: string;
}

export interface AuthResponse {
  user: UserData;
  token: string;
}

export const authApi = {
  login: (credentials: LoginCredentials) =>
    apiRequest<AuthResponse>('/auth/login', {
      method: 'POST',
      body: credentials,
    }),

  register: (data: RegisterData) =>
    apiRequest<AuthResponse>('/auth/register', {
      method: 'POST',
      body: data,
    }),

  getMe: (token: string) =>
    apiRequest<{ user: UserData }>('/auth/me', {
      method: 'GET',
      token,
    }),

  updateProfile: (data: ProfileUpdateData, token: string) =>
    apiRequest<{ user: UserData }>('/auth/profile', {
      method: 'PUT',
      body: data,
      token,
    }),

  changePassword: (
    data: { currentPassword: string; newPassword: string },
    token: string
  ) =>
    apiRequest('/auth/password', {
      method: 'PUT',
      body: data,
      token,
    }),

  forgotPassword: (email: string) =>
    apiRequest<{ resetCode?: string }>('/auth/forgot-password', {
      method: 'POST',
      body: { email },
    }),

  resetPassword: (data: { email: string; code: string; newPassword: string }) =>
    apiRequest('/auth/reset-password', {
      method: 'POST',
      body: data,
    }),
};

// Fighter types
export interface Fighter {
  _id: string;
  url: string;
  name: string;
  nickname: string;
  wins: number;
  losses: number;
  draws: number;
  height: string;
  weight: string;
  reach: number | null;
  stance: string;
  dob: string | null;
  slpm: number;
  strikingAccuracy: number;
  sapm: number;
  strikingDefense: number;
  takedownAvg: number;
  takedownAccuracy: number;
  takedownDefense: number;
  submissionAvg: number;
}

export interface FightStats {
  _id: string;
  fightId: string;
  fighterName: string;
  fighterPosition: number;
  knockdowns: number;
  sigStrikes: { landed: number; attempted: number };
  sigStrikesPct: number;
  totalStrikes: { landed: number; attempted: number };
  takedowns: { landed: number; attempted: number };
  takedownPct: number;
  submissionAttempts: number;
  reversals: number;
  controlTime: string;
}

export interface FighterComparison {
  fighter1: {
    profile: Fighter;
    recentStats: FightStats[];
  };
  fighter2: {
    profile: Fighter;
    recentStats: FightStats[];
  };
}

// Fighter API functions
export const fighterApi = {
  getFighters: (page = 1, limit = 50) =>
    apiRequest<Fighter[]>(`/fighters?page=${page}&limit=${limit}`),

  getFighterById: (id: string) =>
    apiRequest<Fighter>(`/fighters/${id}`),

  getFighterByName: (name: string) =>
    apiRequest<Fighter>(`/fighters/name/${encodeURIComponent(name)}`),

  searchFighters: (query: string, limit = 20) =>
    apiRequest<Fighter[]>(`/fighters/search?q=${encodeURIComponent(query)}&limit=${limit}`),

  compareFighters: (fighter1: string, fighter2: string) =>
    apiRequest<FighterComparison>(`/fighters/compare?fighter1=${encodeURIComponent(fighter1)}&fighter2=${encodeURIComponent(fighter2)}`),

  getFighterStats: (id: string, limit = 20) =>
    apiRequest<{ fighter: Fighter; stats: FightStats[]; totalFights: number }>(
      `/fighters/${id}/stats?limit=${limit}`
    ),

  getTopFighters: (stat: string, limit = 10) =>
    apiRequest<Fighter[]>(`/fighters/top?stat=${stat}&limit=${limit}`),
};

// Event types
export interface Event {
  _id: string;
  url: string;
  eventId: string;
  name: string;
  date: string;
  location: string;
  status: 'upcoming' | 'completed';
}

export interface EventStats {
  totalEvents: number;
  upcomingCount: number;
  completedCount: number;
  latestEvent: Event | null;
  nextEvent: Event | null;
}

// Event API functions
export const eventApi = {
  getEvents: (page = 1, limit = 20, status?: 'upcoming' | 'completed') => {
    let url = `/events?page=${page}&limit=${limit}`;
    if (status) url += `&status=${status}`;
    return apiRequest<Event[]>(url);
  },

  getEventById: (id: string) =>
    apiRequest<Event>(`/events/${id}`),

  getEventByEventId: (eventId: string) =>
    apiRequest<Event>(`/events/event/${eventId}`),

  getUpcomingEvents: (limit = 10) =>
    apiRequest<Event[]>(`/events/upcoming?limit=${limit}`),

  getRecentEvents: (limit = 10) =>
    apiRequest<Event[]>(`/events/recent?limit=${limit}`),

  searchEvents: (query: string, limit = 20) =>
    apiRequest<Event[]>(`/events/search?q=${encodeURIComponent(query)}&limit=${limit}`),

  getEventStats: () =>
    apiRequest<EventStats>('/events/stats'),

  getEventFights: (eventId: string) =>
    apiRequest<Array<{ fightId: string; fighters: FightStats[] }>>(`/events/${eventId}/fights`),
};

// Prediction types
export interface PredictionResult {
  fighter1: { name: string; record: string; probability: number };
  fighter2: { name: string; record: string; probability: number };
  prediction: {
    winner: string;
    method: string;
    round: number;
    confidence: number;
    factors: string[];
  };
  id?: string;
}

export interface PredictionRecord {
  _id: string;
  fighter1Name: string;
  fighter2Name: string;
  predictedWinner: string;
  winProbability: number;
  method: string;
  predictedRound: number;
  confidence: number;
  factors: string[];
  createdAt: string;
}

// Prediction API
export const predictionApi = {
  predict: (fighter1Name: string, fighter2Name: string, token: string) =>
    apiRequest<PredictionResult>('/predictions', {
      method: 'POST',
      body: { fighter1Name, fighter2Name },
      token,
    }),

  getHistory: (token: string, page = 1, limit = 20) =>
    apiRequest<PredictionRecord[]>(`/predictions/history?page=${page}&limit=${limit}`, { token }),
};

// Roadmap types
export interface Roadmap {
  id: string;
  discipline: string;
  ageGroup: string;
  title: string;
  weeks: number;
  description: string;
}

export interface RoadmapProgressData {
  _id: string;
  roadmapId: string;
  discipline: string;
  ageGroup: string;
  completedTasks: string[];
  currentWeek: number;
  totalWeeks: number;
}

// Roadmap API
export const roadmapApi = {
  getRoadmaps: () =>
    apiRequest<Roadmap[]>('/roadmaps'),

  getProgress: (token: string) =>
    apiRequest<RoadmapProgressData[]>('/roadmaps/progress', { token }),

  saveProgress: (data: { roadmapId: string; discipline: string; ageGroup: string; completedTasks: string[]; currentWeek: number }, token: string) =>
    apiRequest<RoadmapProgressData>('/roadmaps/progress', {
      method: 'POST',
      body: data,
      token,
    }),
};

// Gym types
export interface GymData {
  _id: string;
  name: string;
  city: string;
  area: string;
  address: string;
  rating: number;
  reviewCount: number;
  disciplines: string[];
  phone: string;
  website?: string;
  hours: string;
  image: string;
  description: string;
  features: string[];
  priceRange: string;
  lat: number;
  lng: number;
  distance?: number;
}

// Gym API
export const gymApi = {
  getGyms: (params?: { city?: string; discipline?: string; search?: string; sort?: string }) => {
    const query = new URLSearchParams();
    if (params?.city) query.set('city', params.city);
    if (params?.discipline) query.set('discipline', params.discipline);
    if (params?.search) query.set('search', params.search);
    if (params?.sort) query.set('sort', params.sort);
    return apiRequest<GymData[]>(`/gyms?${query.toString()}`);
  },

  getNearbyGyms: (lat: number, lng: number, radius = 50) =>
    apiRequest<GymData[]>(`/gyms/nearby?lat=${lat}&lng=${lng}&radius=${radius}`),

  seedGyms: () =>
    apiRequest('/gyms/seed', { method: 'POST' }),
};

// Form Check types
export interface FormCheckResult {
  technique: string;
  overallScore: number;
  result: string;
  feedback: { category: string; score: number; tips: string[] }[];
  bodyParts: { part: string; status: string; feedback: string }[];
}

export interface FormSessionRecord {
  _id: string;
  technique: string;
  overallScore: number;
  result: string;
  createdAt: string;
}

// Form Check API
export const formCheckApi = {
  analyze: (technique: string, token: string) =>
    apiRequest<FormCheckResult>('/form-check', {
      method: 'POST',
      body: { technique },
      token,
    }),

  getHistory: (token: string) =>
    apiRequest<FormSessionRecord[]>('/form-check/history', { token }),
};

// Gear types
export interface ProductData {
  _id: string;
  name: string;
  category: string;
  price: number;
  images: string[];
  description: string;
  stock: number;
  rating: number;
  reviewCount: number;
  featured: boolean;
}

export interface OrderData {
  _id: string;
  items: { productId: string; name: string; price: number; quantity: number }[];
  total: number;
  status: string;
  shippingAddress: string;
  createdAt: string;
}

// Gear API
export const gearApi = {
  getProducts: (params?: { category?: string; search?: string; sort?: string; featured?: boolean }) => {
    const query = new URLSearchParams();
    if (params?.category) query.set('category', params.category);
    if (params?.search) query.set('search', params.search);
    if (params?.sort) query.set('sort', params.sort);
    if (params?.featured) query.set('featured', 'true');
    return apiRequest<ProductData[]>(`/gear?${query.toString()}`);
  },

  getProduct: (id: string) =>
    apiRequest<ProductData>(`/gear/${id}`),

  checkout: (items: { productId: string; quantity: number }[], shippingAddress: string, token: string) =>
    apiRequest<OrderData>('/gear/checkout', {
      method: 'POST',
      body: { items, shippingAddress },
      token,
    }),

  getOrders: (token: string) =>
    apiRequest<OrderData[]>('/gear/orders', { token }),

  seedProducts: () =>
    apiRequest('/gear/seed', { method: 'POST' }),
};

// Chat types
export interface ChatResponse {
  response: string;
  intent: string;
  links: { label: string; url: string }[];
  sessionId: string;
}

// Chat API
export const chatApi = {
  sendMessage: (message: string, sessionId: string, token?: string | null) =>
    apiRequest<ChatResponse>('/chat', {
      method: 'POST',
      body: { message, sessionId },
      token,
    }),

  getHistory: (sessionId: string, token: string) =>
    apiRequest('/chat/history' + (sessionId ? `?sessionId=${encodeURIComponent(sessionId)}` : ''), { token }),
};

// ============================================
// Stats API
// ============================================

export interface UserStats {
  predictionsMade: number;
  accuracyRate: number;
  trainingSessions: number;
  daysActive: number;
  formCheckSessions: number;
  formAvgScore: number;
  ordersPlaced: number;
  chatSessions: number;
  recentActivity: { type: string; description: string; date: string }[];
  roadmapProgress: { discipline: string; ageGroup: string; completedTasks: number; currentWeek: number; totalWeeks: number; progress: number }[];
}

export const statsApi = {
  getUserStats: (token: string) =>
    apiRequest<UserStats>('/stats', { token }),
};

export { apiRequest, ApiError, API_BASE_URL };
