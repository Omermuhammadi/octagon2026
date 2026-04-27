import { Request, Response } from 'express';
import { Fighter } from '../models/Fighter';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

async function callGroq(systemPrompt: string, userMessage: string): Promise<string> {
  if (!GROQ_API_KEY || GROQ_API_KEY === 'your-groq-api-key') {
    return generateFallbackGamePlan(userMessage);
  }
  const res = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${GROQ_API_KEY}` },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userMessage }],
      max_tokens: 500,
      temperature: 0.65,
    }),
  });
  if (!res.ok) return generateFallbackGamePlan(userMessage);
  const json = await res.json() as any;
  return json.choices?.[0]?.message?.content?.trim() || generateFallbackGamePlan(userMessage);
}

function generateFallbackGamePlan(context: string): string {
  return `## AI Game Plan

**Striking Strategy**
- Establish the jab early to measure range and disrupt opponent's rhythm
- Throw power shots in combination, don't commit to single strikes
- Use low kicks to slow their footwork

**Grappling Approach**
- Be first to close distance if opponent is a striker
- Control the clinch, land short elbows and knees
- If you shoot for takedowns, always have a backup to the body lock

**Defensive Priorities**
- Keep your chin tucked and hands high on the outside
- Don't back straight up — circle away from their power hand
- Reset position when pressured against the fence

**Mental Edge**
- Stick to the game plan in the first round; assess and adjust
- Stay composed — emotional fighters make costly mistakes late
- Visualise each exchange ending in your favour`;
}

export const generateDossier = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const { opponentName, fightCampId } = req.body;

    if (!opponentName) {
      res.status(400).json({ success: false, message: 'opponentName is required' });
      return;
    }

    // Try to find opponent in UFC fighter DB (case-insensitive, partial match)
    const opponentFighter = await Fighter.findOne({
      name: { $regex: opponentName, $options: 'i' },
    }).select('name record wins losses draws slpm stracc tdavg tda subavg weightClass stance');

    let opponentStats = '';
    if (opponentFighter) {
      opponentStats = `
Opponent: ${opponentFighter.name}
Record: ${opponentFighter.wins ?? '?'}-${opponentFighter.losses ?? '?'}-${opponentFighter.draws ?? '?'}
Weight Class: ${(opponentFighter as any).weightClass ?? 'Unknown'}
Stance: ${(opponentFighter as any).stance ?? 'Orthodox'}
Strikes Landed/min: ${(opponentFighter as any).slpm ?? 'N/A'}
Strike Accuracy: ${(opponentFighter as any).stracc ?? 'N/A'}%
Takedown Avg: ${(opponentFighter as any).tdavg ?? 'N/A'}/15min
Takedown Acc: ${(opponentFighter as any).tda ?? 'N/A'}%
Submission Avg: ${(opponentFighter as any).subavg ?? 'N/A'}/15min`;
    } else {
      opponentStats = `Opponent: ${opponentName} (no UFC stats found — generating general game plan)`;
    }

    const userContext = `
Fighter Profile:
- Name: ${user.name}
- Discipline: ${user.discipline || 'MMA'}
- Experience: ${user.experienceLevel || 'Intermediate'}
- Training Goal: ${user.trainingGoal || 'Competition Preparation'}`;

    const systemPrompt = `You are an elite UFC coach and fight analyst. Generate a concise, actionable fight camp game plan in markdown format. Be specific, tactical, and professional. Format with clear sections: Striking Strategy, Grappling Approach, Defensive Priorities, Conditioning Notes, and Mental Edge. Max 400 words total.`;

    const userMessage = `${userContext}

${opponentStats}

Generate a personalised game plan for beating this opponent.`;

    const gamePlan = await callGroq(systemPrompt, userMessage);

    res.json({
      success: true,
      data: {
        opponentName,
        opponentStats: opponentFighter ? {
          record: `${(opponentFighter as any).wins ?? 0}-${(opponentFighter as any).losses ?? 0}-${(opponentFighter as any).draws ?? 0}`,
          weightClass: (opponentFighter as any).weightClass ?? 'Unknown',
          stance: (opponentFighter as any).stance ?? 'Orthodox',
          slpm: (opponentFighter as any).slpm ?? 0,
          stracc: (opponentFighter as any).stracc ?? 0,
          tdavg: (opponentFighter as any).tdavg ?? 0,
          tda: (opponentFighter as any).tda ?? 0,
          subavg: (opponentFighter as any).subavg ?? 0,
        } : null,
        gamePlan,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const searchOpponent = async (req: Request, res: Response): Promise<void> => {
  try {
    const { q } = req.query;
    if (!q || typeof q !== 'string' || q.length < 2) {
      res.json({ success: true, data: [] });
      return;
    }
    const fighters = await Fighter.find({ name: { $regex: q, $options: 'i' } })
      .select('name wins losses draws weightClass stance slpm stracc tdavg tda subavg')
      .limit(8);
    res.json({ success: true, data: fighters });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};
