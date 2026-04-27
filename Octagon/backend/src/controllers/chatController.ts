import { Request, Response } from 'express';
import { ChatLog, Fighter, Gym, Product, Event } from '../models';
import { AuthRequest } from '../middleware';

// ============================================
// GROQ LLM CONFIGURATION
// ============================================

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

function isLLMEnabled(): boolean {
  return GROQ_API_KEY.length > 0 && GROQ_API_KEY !== 'your-groq-api-key';
}

const SYSTEM_PROMPT = `You are Oracle AI — an elite MMA analyst and coach with 15+ years of UFC experience built into Octagon Oracle.

RESPONSE FORMAT RULES (CRITICAL):
- Maximum 80 words per response. Be sharp and specific, not verbose.
- Use bullet points ONLY when listing 3+ items. Otherwise write 1-2 sentences.
- Lead with the most important fact. Cut filler phrases ("Great question!", "Of course!", "Sure!").
- When fighter data is provided, cite exact numbers (record, accuracy %, SLPM).
- Never repeat the question back. Never apologize for not knowing something — just answer what you know.

EXPERTISE DOMAINS:
- UFC/MMA fighter stats, records, fighting styles, matchup analysis
- Striking technique: jab, cross, hook, uppercut, kicks, combos
- Grappling: takedowns, guard, submissions, BJJ, wrestling
- Training methodology: periodization, conditioning, technique drills
- MMA rules, weight classes, scoring criteria
- Self-defense and real-world safety techniques

PLATFORM NAVIGATION (use [label](/route) format):
- /prediction — Fight predictions
- /comparison — Fighter comparison with radar charts
- /events — Upcoming/past UFC events
- /training — Training roadmaps (BJJ, Wrestling, MMA)
- /gyms — Gym finder Pakistan
- /form-check — AI technique analysis
- /gear — Equipment store
- /self-defense — Safety guide

RULES:
- Stay on MMA, martial arts, fitness, self-defense topics only
- When DB data is retrieved, weave it naturally into a short answer
- NEVER discuss weapons, illegal activities, gambling/betting, steroids
- Use bold for key stats/names. Keep markdown minimal.`;

// ============================================
// GUARDRAILS - Content safety
// ============================================

const blockedPatterns = [
  /how\s+to\s+(kill|hurt|injure|harm)\s+(someone|people|person)/i,
  /make\s+(a\s+)?(bomb|weapon|explosive)/i,
  /illegal\s+(drug|substance)/i,
  /(hack|crack)\s+(into|someone)/i,
];

const inappropriateTopics = [
  'gambling', 'betting odds', 'place a bet', 'steroids',
  'performance enhancing', 'doping', 'illegal fighting',
];

function isInappropriate(message: string): boolean {
  const lower = message.toLowerCase();

  for (const pattern of blockedPatterns) {
    if (pattern.test(message)) return true;
  }

  for (const topic of inappropriateTopics) {
    if (lower.includes(topic)) return true;
  }

  return false;
}

// ============================================
// KNOWLEDGE BASE (fallback when LLM unavailable)
// ============================================

interface KnowledgeEntry {
  keywords: string[];
  answer: string;
  links?: { label: string; url: string }[];
  weight: number;
}

const knowledgeBase: KnowledgeEntry[] = [
  {
    keywords: ['train', 'roadmap', 'learn', 'curriculum', 'program', 'schedule', 'routine', 'workout'],
    answer: 'We offer structured training roadmaps for BJJ, Wrestling, and MMA, tailored by age group (under 15, 15-25, 25+). Each roadmap includes exercises, weekly tasks, and progress tracking. Your progress is saved automatically so you can pick up where you left off.',
    links: [{ label: 'Training Roadmaps', url: '/training' }],
    weight: 1.0,
  },
  {
    keywords: ['predict', 'who will win', 'fight', 'winner', 'probability', 'chance', 'odds', 'matchup'],
    answer: 'Our AI prediction engine analyzes fighter statistics including striking accuracy, takedown defense, win rate, and recent performance. It uses a logistic regression model trained on 8,400+ real fights to generate win probabilities, predicted method (KO/TKO, Submission, Decision), and the top factors influencing the outcome.',
    links: [{ label: 'Fight Predictions', url: '/prediction' }],
    weight: 1.0,
  },
  {
    keywords: ['compar', 'vs', 'versus', 'matchup', 'head to head', 'against', 'side by side'],
    answer: 'Compare any two UFC fighters head-to-head with detailed statistics, radar charts, and AI-generated strategy suggestions. See strengths and weaknesses across striking, grappling, and athletic dimensions.',
    links: [{ label: 'Fighter Comparison', url: '/comparison' }],
    weight: 1.0,
  },
  {
    keywords: ['gym', 'near me', 'location', 'train near', 'dojo', 'academy', 'club', 'class'],
    answer: 'Find martial arts gyms across Pakistan including Karachi, Lahore, Islamabad, Rawalpindi, and Faisalabad. Filter by discipline (MMA, BJJ, Boxing, Muay Thai), city, and see ratings, pricing, and contact info. Enable location to find gyms nearby.',
    links: [{ label: 'Gym Finder', url: '/gyms' }],
    weight: 1.0,
  },
  {
    keywords: ['form', 'technique', 'video', 'check my', 'pose', 'correction', 'analyze my', 'feedback'],
    answer: 'Upload a training video to get AI-powered form analysis. Our system uses MediaPipe pose estimation to detect 33 body landmarks and analyze your stance, hip rotation, guard position, and extension. Get a score and specific feedback for jab-cross, hook, kick, and defensive techniques.',
    links: [{ label: 'Form Check', url: '/form-check' }],
    weight: 1.0,
  },
  {
    keywords: ['gear', 'buy', 'shop', 'glove', 'equipment', 'store', 'product', 'purchase', 'pad', 'guard'],
    answer: 'Browse our collection of MMA training gear including gloves, pads, protection, apparel, and equipment. We carry professional-grade products for all training levels with detailed descriptions and ratings.',
    links: [{ label: 'Gear Store', url: '/gear' }],
    weight: 1.0,
  },
  {
    keywords: ['self-defense', 'protect', 'safety', 'attack', 'defend', 'women', 'street', 'assault', 'danger'],
    answer: 'Our self-defense guide covers 25+ real-world scenarios with detailed do/don\'t lists, threat assessments, and specific techniques for each situation. We have a dedicated women\'s safety section with tips for home safety, travel, public transport, and emergency contacts.',
    links: [{ label: 'Self-Defense Guide', url: '/self-defense' }],
    weight: 1.0,
  },
  {
    keywords: ['beginner', 'start', 'new to', 'first time', 'never trained', 'getting started', 'noob', 'newbie'],
    answer: 'Welcome! Start with our beginner roadmap which covers basic stance, striking fundamentals, and simple defense techniques. Choose your age group for a tailored experience. We recommend:\n1. Pick a training roadmap (BJJ or Wrestling basics)\n2. Find a gym near you for hands-on training\n3. Check our self-defense guide for practical safety tips',
    links: [{ label: 'Training', url: '/training' }, { label: 'Find a Gym', url: '/gyms' }, { label: 'Self-Defense', url: '/self-defense' }],
    weight: 1.2,
  },
  {
    keywords: ['ufc', 'fighter', 'mma', 'record', 'stats', 'statistics', 'ranking'],
    answer: 'We track 4,400+ UFC fighters with detailed statistics including striking accuracy, takedown averages, and fight records, plus 750+ events. You can search fighters, compare stats, and get AI predictions for matchups.',
    links: [{ label: 'Predictions', url: '/prediction' }, { label: 'Fighter Comparison', url: '/comparison' }],
    weight: 0.8,
  },
  {
    keywords: ['jab', 'cross', 'punch', 'hook', 'uppercut', 'striking', 'boxing', 'combo'],
    answer: 'For striking technique:\n- **Jab**: Keep guard up, extend lead hand fully, snap back quickly\n- **Cross**: Rotate hips, full extension, return to guard\n- **Hook**: 90° elbow angle, rotate from hips, keep rear hand up\n\nUpload a video on the Form Check page to get AI feedback on your technique!',
    links: [{ label: 'Form Check', url: '/form-check' }, { label: 'Training', url: '/training' }],
    weight: 0.9,
  },
  {
    keywords: ['kick', 'roundhouse', 'leg kick', 'muay thai', 'shin', 'teep', 'front kick'],
    answer: 'For kick technique:\n- **Roundhouse**: Pivot on ball of support foot, turn hip over, strike with shin\n- **Teep/Front Kick**: Chamber knee high, push through target\n- **Leg Kick**: Low stance, aim above/below knee\n\nUse our Form Check to analyze your kick form with AI!',
    links: [{ label: 'Form Check', url: '/form-check' }, { label: 'Training', url: '/training' }],
    weight: 0.9,
  },
  {
    keywords: ['takedown', 'wrestling', 'grappling', 'ground', 'submission', 'bjj', 'guard', 'mount', 'choke'],
    answer: 'For grappling fundamentals:\n- **Wrestling**: Focus on level changes, shot setup, and finishing doubles/singles\n- **BJJ**: Start with guard retention, hip escapes, and basic sweeps\n- **Submissions**: Learn rear naked choke, armbar, and triangle as fundamentals\n\nOur training roadmaps have structured BJJ and Wrestling paths!',
    links: [{ label: 'Training Roadmaps', url: '/training' }],
    weight: 0.9,
  },
  {
    keywords: ['account', 'profile', 'login', 'register', 'sign up', 'password', 'settings'],
    answer: 'You can manage your account from the Profile page. Update your name, training goals, experience level, and preferred disciplines. Your training progress, predictions, and form check history are all saved to your profile.',
    links: [{ label: 'Profile', url: '/profile' }],
    weight: 0.7,
  },
  {
    keywords: ['coach', 'coaching', 'strategy', 'game plan', 'prepare'],
    answer: 'As a coach, you can use our platform to:\n1. Analyze opponent weaknesses with Fighter Comparison\n2. Get AI strategy suggestions for matchups\n3. Create training plans using roadmaps\n4. Analyze fighter form with video upload',
    links: [{ label: 'Comparison', url: '/comparison' }, { label: 'Predictions', url: '/prediction' }],
    weight: 0.9,
  },
  {
    keywords: ['event', 'card', 'fight night', 'ppv', 'upcoming', 'next fight', 'when is', 'schedule', 'result', 'who won', 'main event', 'fight card'],
    answer: 'We track upcoming and past UFC events with full fight cards, main event details, venues, and results. Events are auto-synced daily from TheSportsDB. You can browse upcoming events, see completed fight cards with winners, and search by event name.',
    links: [{ label: 'UFC Events', url: '/events' }],
    weight: 1.0,
  },
];

// ============================================
// INTENT DETECTION (weighted scoring - fallback)
// ============================================

interface IntentResult {
  intent: string;
  confidence: number;
  entry: KnowledgeEntry | null;
}

function detectIntent(message: string): IntentResult {
  const lower = message.toLowerCase().trim();

  if (/^(hi|hello|hey|sup|yo|what'?s up|howdy)\b/i.test(lower) || lower.length < 5) {
    return { intent: 'greeting', confidence: 1.0, entry: null };
  }

  let bestScore = 0;
  let bestEntry: KnowledgeEntry | null = null;

  for (const entry of knowledgeBase) {
    let score = 0;
    let matchCount = 0;

    for (const keyword of entry.keywords) {
      if (lower.includes(keyword)) {
        score += keyword.length * 0.1;
        matchCount++;
      }
    }

    if (matchCount > 1) score *= 1.5;
    if (matchCount > 2) score *= 1.3;
    score *= entry.weight;

    if (score > bestScore) {
      bestScore = score;
      bestEntry = entry;
    }
  }

  if (bestScore > 0 && bestEntry) {
    return {
      intent: bestEntry.keywords[0],
      confidence: Math.min(bestScore / 3, 1.0),
      entry: bestEntry,
    };
  }

  return { intent: 'general', confidence: 0, entry: null };
}

// ============================================
// RETRIEVAL SYSTEM - Query internal data
// ============================================

async function retrieveFighterInfo(message: string): Promise<string | null> {
  const cleanMsg = message.replace(/[^a-zA-Z\s'-]/g, '').trim();
  if (cleanMsg.length < 3) return null;

  const stopWords = new Set([
    'tell', 'about', 'who', 'what', 'how', 'the', 'are', 'was', 'were',
    'been', 'being', 'have', 'has', 'had', 'does', 'did', 'will', 'would',
    'could', 'should', 'may', 'might', 'shall', 'can', 'need', 'dare',
    'show', 'give', 'find', 'know', 'like', 'want', 'look', 'info',
    'information', 'stats', 'statistics', 'record', 'details', 'fighter',
    'fight', 'fights', 'win', 'wins', 'loss', 'losses', 'for', 'and',
    'his', 'her', 'him', 'she', 'they', 'them', 'this', 'that', 'with',
    'from', 'more', 'some', 'any', 'all', 'get', 'got', 'let', 'say',
    'said', 'see', 'seen', 'think', 'thought', 'make', 'made', 'just',
  ]);

  const words = cleanMsg.split(/\s+/).filter(w =>
    w.length >= 3 && !stopWords.has(w.toLowerCase())
  );

  if (words.length === 0) return null;

  for (let i = 0; i < words.length; i++) {
    for (let j = Math.min(i + 3, words.length); j > i; j--) {
      const nameCandidate = words.slice(i, j).join(' ');
      if (nameCandidate.length < 3) continue;

      const pattern = j - i === 1
        ? `\\b${nameCandidate}\\b`
        : nameCandidate;

      const fighter = await Fighter.findOne({
        name: { $regex: pattern, $options: 'i' },
      }).lean();

      if (fighter) {
        const winRate = fighter.wins + fighter.losses > 0
          ? ((fighter.wins / (fighter.wins + fighter.losses)) * 100).toFixed(1)
          : 'N/A';

        return `**${fighter.name}** - Record: ${fighter.wins}-${fighter.losses}-${fighter.draws} (${winRate}% win rate)\n` +
          `Striking: ${fighter.strikingAccuracy}% accuracy, ${fighter.slpm} strikes/min\n` +
          `Grappling: ${fighter.takedownAccuracy}% TD accuracy, ${fighter.submissionAvg} sub avg/15min\n` +
          `Defense: ${fighter.strikingDefense}% striking def, ${fighter.takedownDefense}% TD def`;
      }
    }
  }

  return null;
}

async function retrieveGymInfo(message: string): Promise<string | null> {
  const lower = message.toLowerCase();
  const cities = ['karachi', 'lahore', 'islamabad', 'rawalpindi', 'faisalabad'];
  const mentionedCity = cities.find(c => lower.includes(c));

  if (mentionedCity || lower.includes('gym') || lower.includes('near')) {
    const filter: Record<string, any> = {};
    if (mentionedCity) {
      filter.city = { $regex: mentionedCity, $options: 'i' };
    }

    const gyms = await Gym.find(filter).sort({ rating: -1 }).limit(3).lean();

    if (gyms.length > 0) {
      const gymList = gyms.map(g =>
        `- **${g.name}** (${g.city}) - ${g.rating}/5 stars, ${g.disciplines.join(', ')} | ${g.priceRange}`
      ).join('\n');

      return `Top gyms${mentionedCity ? ` in ${mentionedCity.charAt(0).toUpperCase() + mentionedCity.slice(1)}` : ''}:\n${gymList}`;
    }
  }

  return null;
}

async function retrieveProductInfo(message: string): Promise<string | null> {
  const lower = message.toLowerCase();
  const categories = ['gloves', 'pads', 'protection', 'apparel', 'equipment'];
  const mentionedCat = categories.find(c => lower.includes(c) || lower.includes(c.slice(0, -1)));

  if (mentionedCat || lower.includes('gear') || lower.includes('buy') || lower.includes('recommend')) {
    const filter: Record<string, any> = {};
    if (mentionedCat) filter.category = mentionedCat;

    const products = await Product.find(filter).sort({ rating: -1 }).limit(3).lean();

    if (products.length > 0) {
      const productList = products.map(p =>
        `- **${p.name}** - Rs. ${p.price.toLocaleString()} (${p.rating}/5 stars, ${p.reviewCount} reviews)`
      ).join('\n');

      return `Top products${mentionedCat ? ` in ${mentionedCat}` : ''}:\n${productList}`;
    }
  }

  return null;
}

async function retrieveEventInfo(message: string): Promise<string | null> {
  const lower = message.toLowerCase();
  const eventKeywords = ['event', 'card', 'ufc', 'fight night', 'ppv', 'upcoming', 'next fight', 'when is', 'schedule', 'result', 'who won', 'main event', 'fight card'];

  if (eventKeywords.some(k => lower.includes(k))) {
    const wantsResults = /result|who won|winner|last|recent|completed/i.test(lower);
    const wantsUpcoming = /upcoming|next|schedule|when|future/i.test(lower) || !wantsResults;

    const queries: Promise<any[]>[] = [];
    if (wantsUpcoming) {
      queries.push(Event.find({ status: 'upcoming' }).sort({ date: 1 }).limit(3).lean());
    } else {
      queries.push(Promise.resolve([]));
    }
    if (wantsResults || !wantsUpcoming) {
      queries.push(Event.find({ status: 'completed' }).sort({ date: -1 }).limit(3).lean());
    } else {
      queries.push(Promise.resolve([]));
    }

    const [upcoming, recent] = await Promise.all(queries);

    const parts: string[] = [];

    const formatEvent = (e: any): string => {
      const date = new Date(e.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
      const venue = [e.venue, e.city, e.country].filter(Boolean).join(', ') || e.location;
      let line = `- **${e.name}** — ${date} | ${venue}`;

      if (e.fights && e.fights.length > 0) {
        const mainEvent = e.fights.find((f: any) => f.position === 1) || e.fights[0];
        line += `\n  Main Event: ${mainEvent.fighter1} vs ${mainEvent.fighter2}`;
        if (mainEvent.winner) {
          line += ` → Winner: **${mainEvent.winner}**`;
        }
        if (e.fights.length > 1) {
          line += `\n  (${e.fights.length} total fights on card)`;
        }
      }

      return line;
    };

    if (upcoming.length > 0) {
      parts.push(`Upcoming UFC events:\n${upcoming.map(formatEvent).join('\n')}`);
    }

    if (recent.length > 0) {
      parts.push(`Recent completed events:\n${recent.map(formatEvent).join('\n')}`);
    }

    if (parts.length > 0) {
      parts.push('View all events at [Events Page](/events)');
    }

    return parts.length > 0 ? parts.join('\n\n') : null;
  }

  return null;
}

// ============================================
// RETRIEVAL CONTEXT GATHERER
// ============================================

async function gatherRetrievalContext(message: string): Promise<string> {
  const contextParts: string[] = [];

  const [fighterData, gymData, productData, eventData] = await Promise.all([
    retrieveFighterInfo(message),
    retrieveGymInfo(message),
    retrieveProductInfo(message),
    retrieveEventInfo(message),
  ]);

  if (fighterData) {
    contextParts.push(`[FIGHTER DATA FROM DATABASE]\n${fighterData}`);
  }
  if (gymData) {
    contextParts.push(`[GYM DATA FROM DATABASE]\n${gymData}`);
  }
  if (productData) {
    contextParts.push(`[PRODUCT DATA FROM DATABASE]\n${productData}`);
  }
  if (eventData) {
    contextParts.push(`[EVENT DATA FROM DATABASE]\n${eventData}`);
  }

  return contextParts.length > 0
    ? '\n\n--- RETRIEVED INTERNAL DATA ---\n' + contextParts.join('\n\n')
    : '';
}

// ============================================
// LLM RESPONSE GENERATOR (Groq)
// ============================================

interface LLMResponse {
  text: string;
  links: { label: string; url: string }[];
  usedLLM: boolean;
}

async function generateLLMResponse(
  message: string,
  retrievalContext: string,
  chatHistory: { role: string; content: string }[]
): Promise<LLMResponse> {
  if (!isLLMEnabled()) {
    throw new Error('LLM not configured');
  }

  // Build messages array with system prompt + retrieval context
  const systemMessage = retrievalContext
    ? SYSTEM_PROMPT + '\n\n' + retrievalContext
    : SYSTEM_PROMPT;

  const messages: { role: string; content: string }[] = [
    { role: 'system', content: systemMessage },
  ];

  // Add recent chat history for context (last 6 messages)
  if (chatHistory.length > 0) {
    const recent = chatHistory.slice(-6);
    for (const msg of recent) {
      messages.push({ role: msg.role, content: msg.content });
    }
  }

  // Add current user message
  messages.push({ role: 'user', content: message });

  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages,
      temperature: 0.65,
      max_tokens: 350,
      top_p: 0.9,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Groq API error:', response.status, errorText);
    throw new Error(`Groq API error: ${response.status}`);
  }

  const data: any = await response.json();
  const assistantMessage = data.choices?.[0]?.message?.content || '';

  // Extract links from the response (markdown link pattern)
  const links: { label: string; url: string }[] = [];
  const linkRegex = /\[([^\]]+)\]\((\/[a-z-]+)\)/g;
  let match;
  while ((match = linkRegex.exec(assistantMessage)) !== null) {
    links.push({ label: match[1], url: match[2] });
  }

  return {
    text: assistantMessage,
    links,
    usedLLM: true,
  };
}

// ============================================
// FALLBACK RESPONSE BUILDER (no LLM)
// ============================================

async function buildFallbackResponse(
  message: string,
  intentResult: IntentResult
): Promise<{ text: string; links: { label: string; url: string }[] }> {
  let links: { label: string; url: string }[] = [];

  if (intentResult.intent === 'greeting') {
    return {
      text: "Hey! I'm Oracle AI, your MMA assistant. I can help you with:\n\n" +
        "- **Fight Predictions** - AI-powered winner predictions\n" +
        "- **Fighter Comparison** - Head-to-head stats and strategy\n" +
        "- **UFC Events** - Upcoming events, fight cards, and results\n" +
        "- **Training Roadmaps** - Structured plans by age group\n" +
        "- **Gym Finder** - Find gyms near you in Pakistan\n" +
        "- **Form Analysis** - AI pose feedback on your technique\n" +
        "- **Gear Store** - Browse and buy training equipment\n" +
        "- **Self-Defense** - Real-world safety guides\n\n" +
        "What would you like to explore?",
      links: [],
    };
  }

  if (intentResult.entry) {
    let responseText = intentResult.entry.answer;
    links = intentResult.entry.links || [];

    if (intentResult.intent === 'gym' || intentResult.intent === 'near me') {
      const gymInfo = await retrieveGymInfo(message);
      if (gymInfo) responseText += '\n\n' + gymInfo;
    }

    if (intentResult.intent === 'gear' || intentResult.intent === 'buy') {
      const productInfo = await retrieveProductInfo(message);
      if (productInfo) responseText += '\n\n' + productInfo;
    }

    return { text: responseText, links };
  }

  const fighterInfo = await retrieveFighterInfo(message);
  if (fighterInfo) {
    return {
      text: fighterInfo + '\n\nWant to compare this fighter with someone else or get a prediction?',
      links: [
        { label: 'Compare Fighters', url: '/comparison' },
        { label: 'Get Prediction', url: '/prediction' },
      ],
    };
  }

  const gymInfo = await retrieveGymInfo(message);
  if (gymInfo) {
    return {
      text: gymInfo + '\n\nVisit the Gym Finder page for more options and map view.',
      links: [{ label: 'Gym Finder', url: '/gyms' }],
    };
  }

  return {
    text: "I can help you with:\n\n" +
      "- **Fight Predictions** - \"Who would win, Khabib vs McGregor?\"\n" +
      "- **Fighter Stats** - \"Tell me about Conor McGregor\"\n" +
      "- **Training** - \"I want to learn BJJ\" or \"Show me a training roadmap\"\n" +
      "- **Gyms** - \"Find gyms in Karachi\" or \"Gyms near me\"\n" +
      "- **Form Check** - \"How do I check my form?\"\n" +
      "- **Gear** - \"What gloves should I buy?\"\n" +
      "- **Self-Defense** - \"Self-defense tips for women\"\n\n" +
      "Try asking me something specific!",
    links: [
      { label: 'Predictions', url: '/prediction' },
      { label: 'Training', url: '/training' },
      { label: 'Gym Finder', url: '/gyms' },
    ],
  };
}

// ============================================
// CONTROLLERS
// ============================================

// POST /api/chat - Send message and get response
export const sendMessage = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { message, sessionId } = req.body;

    if (!message) {
      res.status(400).json({ success: false, message: 'Message is required' });
      return;
    }

    // Guardrails check (applies regardless of LLM or fallback)
    if (isInappropriate(message)) {
      const safeResponse = "I'm focused on helping with MMA training, fight analysis, and self-defense. I can't help with that topic. Here's what I can assist with:\n- Fight predictions and fighter stats\n- Training roadmaps\n- Gym finder\n- Form analysis\n- Self-defense tips";

      res.json({
        success: true,
        data: {
          response: safeResponse,
          intent: 'blocked',
          links: [{ label: 'Training', url: '/training' }],
          sessionId: sessionId || `session_${Date.now()}`,
          model: 'guardrail',
        },
      });
      return;
    }

    const sid = sessionId || `session_${Date.now()}`;
    let responseText: string;
    let links: { label: string; url: string }[] = [];
    let intent = 'general';
    let confidence = 0;
    let modelUsed = 'keyword';

    // Gather retrieval context from MongoDB
    const retrievalContext = await gatherRetrievalContext(message);

    // Try LLM first, fallback to keyword system
    if (isLLMEnabled()) {
      try {
        // Get recent chat history from this session
        let chatHistory: { role: string; content: string }[] = [];
        try {
          const existingLog = await ChatLog.findOne({ sessionId: sid }).lean();
          if (existingLog && existingLog.messages) {
            chatHistory = existingLog.messages.slice(-6).map((m: any) => ({
              role: m.role,
              content: m.content,
            }));
          }
        } catch {
          // Non-critical
        }

        const llmResult = await generateLLMResponse(message, retrievalContext, chatHistory);
        responseText = llmResult.text;
        links = llmResult.links;
        intent = 'llm';
        confidence = 1.0;
        modelUsed = GROQ_MODEL;
      } catch (llmError) {
        console.error('LLM fallback triggered:', llmError);
        // Fallback to keyword system
        const intentResult = detectIntent(message);
        intent = intentResult.intent;
        confidence = intentResult.confidence;
        const fallback = await buildFallbackResponse(message, intentResult);
        responseText = fallback.text;
        links = fallback.links;
        modelUsed = 'keyword-fallback';
      }
    } else {
      // No LLM configured - use keyword system
      const intentResult = detectIntent(message);
      intent = intentResult.intent;
      confidence = intentResult.confidence;
      const fallback = await buildFallbackResponse(message, intentResult);
      responseText = fallback.text;
      links = fallback.links;
    }

    // Log chat
    try {
      await ChatLog.findOneAndUpdate(
        { sessionId: sid },
        {
          $push: {
            messages: {
              $each: [
                { role: 'user', content: message, timestamp: new Date() },
                { role: 'assistant', content: responseText, timestamp: new Date() },
              ],
            },
          },
          $set: {
            intent,
            ...(req.user && { userId: req.user._id }),
          },
        },
        { upsert: true, new: true }
      );
    } catch {
      // Non-critical: logging failed
    }

    res.json({
      success: true,
      data: {
        response: responseText,
        intent,
        confidence,
        links,
        sessionId: sid,
        model: modelUsed,
      },
    });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/chat/history - Get chat history for a session
export const getChatHistory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.query;

    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    if (sessionId) {
      // Only return sessions belonging to the authenticated user
      const chatLog = await ChatLog.findOne({
        sessionId: sessionId as string,
        userId: req.user._id,
      }).lean();
      res.json({ success: true, data: chatLog });
    } else {
      const chatLogs = await ChatLog.find({ userId: req.user._id })
        .sort({ updatedAt: -1 })
        .limit(20)
        .lean();
      res.json({ success: true, data: chatLogs });
    }
  } catch (error) {
    console.error('Chat history error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
