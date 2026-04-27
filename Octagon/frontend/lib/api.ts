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
  sportsDbId?: string | null;
  venue?: string;
  city?: string;
  country?: string;
  poster?: string;
  thumb?: string;
  fights?: EventFight[];
  lastSynced?: string | null;
}

export interface EventFight {
  position: number;
  fighter1: string;
  fighter2: string;
  winner: string | null;
  fighter1Detail: string | null;
  fighter2Detail: string | null;
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

  syncEvents: (token: string) =>
    apiRequest('/events/sync', { method: 'POST', token }),

  getEventFightCard: (id: string) =>
    apiRequest<EventFight[]>(`/events/${id}/fightcard`),
};

// Prediction types
export interface PredictionResult {
  fighter1: { name: string; record: string; probability: number };
  fighter2: { name: string; record: string; probability: number };
  prediction: {
    winner: string;
    loser?: string;
    method: string;
    round: number;
    confidence: number;
    factors: string[];
    topFactors?: { factor: string; description: string; impact: string; absContrib: number; direction?: 'positive' | 'negative' }[];
    modelStats?: { modelType: string; samples: number; features: number; cvAccuracy: number };
    lastTrained?: string;
    counterfactual?: string | null;
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

// Analytics types
export interface AnalyticsFeatureImportance {
  name: string;
  displayName: string;
  importance: number;
  lrWeight: number;
}

export interface AnalyticsTrainingStats {
  samples: number;
  cvAccuracy: number;
  cvPrecision: number;
  cvRecall: number;
  cvF1: number;
  trainAccuracy?: number;
  lrCvAccuracy?: number;
  gbtCvAccuracy?: number;
  trainedAt: string;
}

export interface AnalyticsDistributionBin {
  min: number;
  max: number;
  count: number;
}

export interface AnalyticsDistribution {
  stat: string;
  displayName: string;
  bins: AnalyticsDistributionBin[];
  mean: number;
  median: number;
  p25: number;
  p75: number;
}

export interface AnalyticsSummary {
  featureImportance: AnalyticsFeatureImportance[];
  trainingStats: AnalyticsTrainingStats | null;
  ensembleWeights: { lr: number; gbt: number } | null;
  weightClassAccuracy?: { weightClass: string; accuracy: number; sampleSize: number }[];
  calibration?: { bin: string; midpoint: number; actualWinRate: number; count: number }[];
  distributions?: AnalyticsDistribution[];
  styleMatrix?: Record<string, Record<string, number>>;
  styleClassificationRules?: {
    Striker: string;
    Grappler: string;
    WellRounded: string;
  };
}

export const analyticsApi = {
  getSummary: () =>
    apiRequest<AnalyticsSummary>('/analytics/summary'),
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
  unlockedWeeks: number[];
}

// Roadmap API
export const roadmapApi = {
  getRoadmaps: () =>
    apiRequest<Roadmap[]>('/roadmaps'),

  getProgress: (token: string) =>
    apiRequest<RoadmapProgressData[]>('/roadmaps/progress', { token }),

  saveProgress: (data: { roadmapId: string; discipline: string; ageGroup: string; completedTasks: string[]; currentWeek: number; unlockedWeeks: number[] }, token: string) =>
    apiRequest<RoadmapProgressData>('/roadmaps/progress', {
      method: 'POST',
      body: data,
      token,
    }),

  canUnlockWeek: (roadmapId: string, weekNumber: number, token: string) =>
    apiRequest<{ unlocked: boolean; completedPrevious: number; requiredPrevious: number }>(
      `/roadmaps/progress/${encodeURIComponent(roadmapId)}/can-unlock/${weekNumber}`,
      { token }
    ),

  validateTaskToggle: (data: { roadmapId: string; taskId: string; tasksPerWeek?: number }, token: string) =>
    apiRequest<{ allowed: boolean; reason?: string }>('/roadmaps/progress/validate', {
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

  createCheckoutSession: (items: { productId: string; quantity: number }[], shippingAddress: string, token: string) =>
    apiRequest<{ sessionId: string; url: string }>('/gear/create-checkout-session', {
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

// ============================================
// Strategy Types
// ============================================

export interface StrategyRating {
  category: string;
  rating: 'HIGH' | 'MEDIUM' | 'LOW';
  detail: string;
}

export interface RoundStrategy {
  round: number;
  approach: 'aggressive' | 'patient' | 'defensive';
  tactics: string[];
  riskLevel: 'high' | 'medium' | 'low';
  notes: string;
}

export interface RangeData {
  fighter1Score: number;
  fighter2Score: number;
  recommendation: string;
}

export interface StrikeZone {
  opponentDefense: number;
  recommendation: string;
  priority: 'primary' | 'secondary' | 'low';
}

export interface DangerZone {
  threat: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  detail: string;
}

export interface CornerRound {
  round: number;
  advice: string[];
}

export interface StrategyResult {
  strategyId: string;
  fighter1: { name: string; record: string; height: string; reach: number | null; stance: string };
  fighter2: { name: string; record: string; height: string; reach: number | null; stance: string };
  prediction: {
    winner: string;
    loser: string;
    winnerProbability: number;
    loserProbability: number;
    predictedMethod: string;
    methodProbabilities: { method: string; probability: number }[];
    predictedRound: number;
    confidence: number;
    topFactors: { factor: string; description: string; impact: string }[];
  };
  strengthsWeaknesses: {
    fighter1: StrategyRating[];
    fighter2: StrategyRating[];
  };
  roundStrategy: RoundStrategy[];
  rangeAnalysis: {
    distance: RangeData;
    clinch: RangeData;
    ground: RangeData;
    bestRange: string;
  };
  strikeTargeting: {
    head: StrikeZone;
    body: StrikeZone;
    legs: StrikeZone;
    primaryTarget: string;
  };
  takedownPlan: {
    yourTdAccuracy: number;
    opponentTdDefense: number;
    opponentTdAccuracy: number;
    yourTdDefense: number;
    verdict: 'shoot' | 'stuff' | 'neutral';
    details: string;
  };
  dangerZones: DangerZone[];
  cornerAdvice: CornerRound[];
  fightStatsAvailable: { fighter1: number; fighter2: number };
}

export interface StrategyHistoryItem {
  _id: string;
  fighter1Name: string;
  fighter2Name: string;
  prediction: {
    winner: string;
    winProbability: number;
    method: string;
  };
  createdAt: string;
}

export interface SavedStrategy extends StrategyResult {
  _id: string;
  coachId: string;
  fighter1Name: string;
  fighter2Name: string;
  createdAt: string;
  updatedAt: string;
}

// Strategy API
export const strategyApi = {
  generate: (fighter1Name: string, fighter2Name: string, token: string) =>
    apiRequest<StrategyResult>('/strategy/generate', {
      method: 'POST',
      body: { fighter1Name, fighter2Name },
      token,
    }),

  getHistory: (token: string, limit = 20) =>
    apiRequest<StrategyHistoryItem[]>(`/strategy/history?limit=${limit}`, { token }),

  getById: (id: string, token: string) =>
    apiRequest<SavedStrategy>(`/strategy/${id}`, { token }),

  delete: (id: string, token: string) =>
    apiRequest(`/strategy/${id}`, { method: 'DELETE', token }),
};

// ============================================
// Coach Roster Types
// ============================================

export interface RosterFighter {
  _id: string;
  fighterId: string;
  fighterName: string;
  notes: string;
  addedAt: string;
  record: string;
  stance: string;
  height: string;
}

export interface UpcomingFight {
  fighterName: string;
  opponent: string;
  eventName: string;
  eventDate: string;
  eventId: string;
}

export interface CoachStats {
  strategiesGenerated: number;
  avgConfidence: number;
}

// Coach Roster API
export const coachRosterApi = {
  getRoster: (token: string) =>
    apiRequest<RosterFighter[]>('/coach/roster', { token }),

  addFighter: (fighterName: string, token: string, notes?: string) =>
    apiRequest<RosterFighter>('/coach/roster', {
      method: 'POST',
      body: { fighterName, notes },
      token,
    }),

  removeFighter: (fighterId: string, token: string) =>
    apiRequest(`/coach/roster/${fighterId}`, { method: 'DELETE', token }),

  getUpcomingFights: (token: string) =>
    apiRequest<UpcomingFight[]>('/coach/roster/upcoming', { token }),

  getCoachStats: (token: string) =>
    apiRequest<CoachStats>('/coach/roster/stats', { token }),
};

// ============================================
// Fighter Training Types
// ============================================

export interface FighterTrainingAssignment {
  _id: string;
  coachId: string;
  fighterId: string;
  fighterName: string;
  roadmapId: string;
  discipline: string;
  ageGroup: string;
  completedTasks: string[];
  currentWeek: number;
  totalWeeks: number;
  unlockedWeeks: number[];
  assignedAt: string;
}

// Fighter Training API
export const fighterTrainingApi = {
  getAssignments: (token: string) =>
    apiRequest<FighterTrainingAssignment[]>('/coach/fighter-training', { token }),

  assign: (data: { fighterName: string; roadmapId: string; discipline: string; ageGroup: string }, token: string) =>
    apiRequest<FighterTrainingAssignment>('/coach/fighter-training', {
      method: 'POST',
      body: data,
      token,
    }),

  updateProgress: (id: string, data: { completedTasks: string[]; currentWeek: number; unlockedWeeks: number[] }, token: string) =>
    apiRequest<FighterTrainingAssignment>(`/coach/fighter-training/${id}`, {
      method: 'PUT',
      body: data,
      token,
    }),

  delete: (id: string, token: string) =>
    apiRequest(`/coach/fighter-training/${id}`, { method: 'DELETE', token }),
};

// ============================================
// Phase 1: Stakeholder Connection Layer
// ============================================

// ---- Coach Relationships ----

export type RelationshipStatus = 'pending' | 'active' | 'declined' | 'ended';

export interface PopulatedUserRef {
  _id: string;
  name: string;
  email: string;
  role: 'coach' | 'fighter' | 'beginner' | 'fan';
  avatar?: string;
  discipline?: string;
  experienceLevel?: string;
  weight?: string;
}

export interface Relationship {
  _id: string;
  coachId: PopulatedUserRef;
  traineeId: PopulatedUserRef;
  traineeRole: 'fighter' | 'beginner';
  status: RelationshipStatus;
  requestedBy: 'coach' | 'trainee';
  notes: string;
  acceptedAt?: string;
  endedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TraineeSummary {
  relationshipId: string;
  _id: string;
  name: string;
  email: string;
  role: 'fighter' | 'beginner';
  avatar?: string;
  discipline?: string;
  experienceLevel?: string;
  weight?: string;
  since?: string;
}

export interface MyCoach {
  relationshipId: string;
  _id: string;
  name: string;
  email: string;
  avatar?: string;
  discipline?: string;
  experienceLevel?: string;
  since?: string;
}

export const relationshipApi = {
  list: (token: string, status?: RelationshipStatus) =>
    apiRequest<Relationship[]>(`/relationships${status ? `?status=${status}` : ''}`, { token }),

  create: (body: { traineeEmail?: string; coachEmail?: string; notes?: string }, token: string) =>
    apiRequest<Relationship>('/relationships', { method: 'POST', body, token }),

  respond: (id: string, action: 'accept' | 'decline', token: string) =>
    apiRequest<Relationship>(`/relationships/${id}/respond`, {
      method: 'PATCH',
      body: { action },
      token,
    }),

  end: (id: string, token: string) =>
    apiRequest<Relationship>(`/relationships/${id}/end`, { method: 'PATCH', token }),

  myTrainees: (token: string) =>
    apiRequest<TraineeSummary[]>('/relationships/trainees', { token }),

  myCoach: (token: string) =>
    apiRequest<MyCoach | null>('/relationships/my-coach', { token }),
};

// ---- Assignments ----

export type AssignmentType = 'training' | 'video' | 'weight' | 'reading' | 'sparring' | 'custom';
export type AssignmentStatus = 'assigned' | 'submitted' | 'completed' | 'overdue';

export interface AssignmentSubmission {
  text?: string;
  videoUrl?: string;
  weightKg?: number;
  submittedAt: string;
}

export interface AssignmentFeedback {
  text: string;
  rating?: number;
  reviewedAt: string;
}

export interface Assignment {
  _id: string;
  coachId: PopulatedUserRef;
  traineeId: PopulatedUserRef;
  traineeRole: 'fighter' | 'beginner';
  type: AssignmentType;
  title: string;
  description: string;
  dueDate: string;
  status: AssignmentStatus;
  submission?: AssignmentSubmission;
  feedback?: AssignmentFeedback;
  createdAt: string;
  updatedAt: string;
}

export interface AssignmentStats {
  assigned: number;
  submitted: number;
  completed: number;
  overdue: number;
  total: number;
}

export const assignmentApi = {
  list: (token: string, params?: { status?: AssignmentStatus; traineeId?: string }) => {
    const qs = params
      ? '?' +
        Object.entries(params)
          .filter(([, v]) => v !== undefined && v !== '')
          .map(([k, v]) => `${k}=${encodeURIComponent(v as string)}`)
          .join('&')
      : '';
    return apiRequest<Assignment[]>(`/assignments${qs}`, { token });
  },

  get: (id: string, token: string) => apiRequest<Assignment>(`/assignments/${id}`, { token }),

  create: (
    body: {
      traineeId: string;
      type: AssignmentType;
      title: string;
      description: string;
      dueDate: string;
    },
    token: string
  ) => apiRequest<Assignment>('/assignments', { method: 'POST', body, token }),

  submit: (
    id: string,
    body: { text?: string; videoUrl?: string; weightKg?: number },
    token: string
  ) =>
    apiRequest<Assignment>(`/assignments/${id}/submit`, {
      method: 'POST',
      body,
      token,
    }),

  review: (
    id: string,
    body: { text: string; rating?: number; markComplete?: boolean },
    token: string
  ) =>
    apiRequest<Assignment>(`/assignments/${id}/review`, {
      method: 'POST',
      body,
      token,
    }),

  delete: (id: string, token: string) =>
    apiRequest(`/assignments/${id}`, { method: 'DELETE', token }),

  stats: (token: string) => apiRequest<AssignmentStats>('/assignments/stats', { token }),
};

// ---- Messages ----

export interface ConversationSummary {
  _id: string;
  otherUser: PopulatedUserRef;
  lastMessage?: {
    text: string;
    senderId: string;
    sentAt: string;
  };
  unread: number;
  updatedAt: string;
}

export interface ChatMessage {
  _id: string;
  conversationId: string;
  senderId: string;
  recipientId: string;
  text: string;
  read: boolean;
  readAt?: string;
  createdAt: string;
}

export interface Thread {
  conversationId: string;
  otherUser: PopulatedUserRef;
  messages: ChatMessage[];
}

export const messageApi = {
  conversations: (token: string) =>
    apiRequest<ConversationSummary[]>('/messages/conversations', { token }),

  thread: (userId: string, token: string) =>
    apiRequest<Thread>(`/messages/thread/${userId}`, { token }),

  send: (userId: string, text: string, token: string) =>
    apiRequest<ChatMessage>(`/messages/thread/${userId}`, {
      method: 'POST',
      body: { text },
      token,
    }),

  unreadCount: (token: string) =>
    apiRequest<{ count: number }>('/messages/unread-count', { token }),
};

// ---- Activity ----

export type ActivityAction =
  | 'relationship_requested'
  | 'relationship_accepted'
  | 'relationship_declined'
  | 'relationship_ended'
  | 'assignment_created'
  | 'assignment_submitted'
  | 'assignment_completed'
  | 'assignment_overdue'
  | 'message_received'
  | 'training_week_completed'
  | 'prediction_made';

export interface ActivityItem {
  _id: string;
  userId: string;
  actorId: string;
  actorName: string;
  action: ActivityAction;
  entityType: string;
  entityId?: string;
  metadata: Record<string, any>;
  read: boolean;
  createdAt: string;
}

export const activityApi = {
  list: (token: string, limit = 30) =>
    apiRequest<ActivityItem[]>(`/activity?limit=${limit}`, { token }),

  markAllRead: (token: string) =>
    apiRequest<{ updated: number }>('/activity/read', { method: 'PATCH', token }),

  unreadCount: (token: string) =>
    apiRequest<{ count: number }>('/activity/unread-count', { token }),
};

// ---- Fight Camp ----

export interface Milestone {
  _id: string;
  title: string;
  targetDate?: string;
  completed: boolean;
  completedAt?: string;
  notes?: string;
}

export interface FightCamp {
  _id: string;
  userId: string;
  coachId?: string;
  opponentName: string;
  opponentRecord?: string;
  fightDate: string;
  weightClass: string;
  venue?: string;
  status: 'upcoming' | 'active' | 'completed' | 'cancelled';
  milestones: Milestone[];
  notes?: string;
  createdAt: string;
}

export interface SparringEntry {
  _id: string;
  userId: string;
  fightCampId?: string;
  date: string;
  partnerName: string;
  rounds: number;
  notes?: string;
  performanceRating: number;
  tags: string[];
  createdAt: string;
}

export const fightCampApi = {
  create: (data: Partial<FightCamp>, token: string) =>
    apiRequest<FightCamp>('/fight-camp', { method: 'POST', body: data, token }),

  getActive: (token: string) =>
    apiRequest<FightCamp | null>('/fight-camp', { token }),

  listAll: (token: string) =>
    apiRequest<FightCamp[]>('/fight-camp/all', { token }),

  updateMilestone: (campId: string, milestoneId: string, data: { completed: boolean; notes?: string }, token: string) =>
    apiRequest<FightCamp>(`/fight-camp/${campId}/milestone/${milestoneId}`, { method: 'PATCH', body: data, token }),

  updateStatus: (campId: string, status: string, token: string) =>
    apiRequest<FightCamp>(`/fight-camp/${campId}/status`, { method: 'PATCH', body: { status }, token }),

  addSparring: (data: Partial<SparringEntry>, token: string) =>
    apiRequest<SparringEntry>('/fight-camp/sparring', { method: 'POST', body: data, token }),

  listSparring: (token: string, fightCampId?: string) =>
    apiRequest<SparringEntry[]>(`/fight-camp/sparring${fightCampId ? `?fightCampId=${fightCampId}` : ''}`, { token }),

  deleteSparring: (id: string, token: string) =>
    apiRequest<{}>(`/fight-camp/sparring/${id}`, { method: 'DELETE', token }),
};

// ---- Weight Cut ----

export interface WeightEntry {
  _id: string;
  date: string;
  weightKg: number;
  notes?: string;
}

export interface WeightLogData {
  _id: string;
  userId: string;
  fightCampId?: string;
  targetWeightKg: number;
  alertThresholdKg: number;
  entries: WeightEntry[];
}

export const weightCutApi = {
  logWeight: (data: { weightKg: number; date?: string; notes?: string; fightCampId?: string }, token: string) =>
    apiRequest<WeightLogData>('/weight-cut/log', { method: 'POST', body: data, token }),

  getHistory: (token: string) =>
    apiRequest<WeightLogData>('/weight-cut/history', { token }),

  setTarget: (data: { targetWeightKg: number; alertThresholdKg?: number; fightCampId?: string }, token: string) =>
    apiRequest<WeightLogData>('/weight-cut/target', { method: 'PUT', body: data, token }),

  deleteEntry: (entryId: string, token: string) =>
    apiRequest<WeightLogData>(`/weight-cut/entry/${entryId}`, { method: 'DELETE', token }),
};

// ---- Opponent Dossier ----

export interface OpponentStats {
  record: string;
  weightClass: string;
  stance: string;
  slpm: number;
  stracc: number;
  tdavg: number;
  tda: number;
  subavg: number;
}

export interface DossierResult {
  opponentName: string;
  opponentStats: OpponentStats | null;
  gamePlan: string;
  generatedAt: string;
}

export const opponentDossierApi = {
  search: (q: string, token: string) =>
    apiRequest<any[]>(`/opponent-dossier/search?q=${encodeURIComponent(q)}`, { token }),

  generate: (opponentName: string, fightCampId: string | undefined, token: string) =>
    apiRequest<DossierResult>('/opponent-dossier/generate', {
      method: 'POST',
      body: { opponentName, fightCampId },
      token,
    }),
};

// ---- Coach Analytics ----

export interface TraineeAnalytics {
  traineeId: string;
  name: string;
  role: 'fighter' | 'beginner';
  weight: { current: number | null; target: number | null; overTarget: number | null } | null;
  assignmentCompletionPct: number;
  sparringThisWeek: number;
  fightCamp: {
    opponentName: string;
    fightDate: string;
    daysRemaining: number;
    milestonesCompleted: number;
    milestonesTotal: number;
  } | null;
}

export interface CoachAnalyticsData {
  trainees: TraineeAnalytics[];
}

export const coachAnalyticsApi = {
  getTraineeAnalytics: (token: string) =>
    apiRequest<CoachAnalyticsData>('/coach/trainee-analytics', { token }),
};

export { apiRequest, ApiError, API_BASE_URL };
