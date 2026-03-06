/**
 * Pose Analysis Engine using MediaPipe Pose Landmarker
 *
 * How it works:
 * 1. MediaPipe detects 33 body landmarks from video frames
 * 2. Joint angles are calculated from landmark positions
 * 3. Angles are compared against "ideal" templates for each technique
 * 4. A score is generated based on deviation from ideal
 * 5. Body-part-specific feedback is provided
 */

// ============================================
// TYPES
// ============================================

export interface PoseLandmark {
  x: number;
  y: number;
  z: number;
  visibility: number;
}

export interface JointAngles {
  leftElbow: number;
  rightElbow: number;
  leftShoulder: number;
  rightShoulder: number;
  leftHip: number;
  rightHip: number;
  leftKnee: number;
  rightKnee: number;
  hipRotation: number; // derived from shoulder-hip alignment
  headPosition: number; // nose Y relative to shoulders
}

export interface AngleRange {
  min: number;
  max: number;
  weight: number; // importance weight for scoring
  label: string;
}

export interface TechniqueTemplate {
  name: string;
  angles: Record<string, AngleRange>;
  bodyPartMapping: Record<string, { angleName: string; idealDesc: string }>;
}

export interface FrameResult {
  timestamp: number;
  landmarks: PoseLandmark[] | null;
  angles: JointAngles | null;
  scores: Record<string, number>;
  overallScore: number;
}

export interface AnalysisResult {
  technique: string;
  techniqueName: string;
  overallScore: number;
  result: 'Good' | 'Needs Improvement';
  breakdown: {
    category: string;
    score: number;
    maxScore: number;
    tips: string[];
  }[];
  bodyParts: {
    part: string;
    status: 'correct' | 'needs-work' | 'incorrect';
    angle?: number;
    feedback: string;
  }[];
  keyMoments: {
    timestamp: string;
    description: string;
    type: 'positive' | 'negative' | 'neutral';
  }[];
  frameCount: number;
  poseDetected: boolean;
}

// ============================================
// LANDMARK INDICES (MediaPipe Pose - 33 landmarks)
// ============================================

const LM = {
  NOSE: 0,
  LEFT_EYE_INNER: 1,
  LEFT_EYE: 2,
  LEFT_EYE_OUTER: 3,
  RIGHT_EYE_INNER: 4,
  RIGHT_EYE: 5,
  RIGHT_EYE_OUTER: 6,
  LEFT_EAR: 7,
  RIGHT_EAR: 8,
  MOUTH_LEFT: 9,
  MOUTH_RIGHT: 10,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_PINKY: 17,
  RIGHT_PINKY: 18,
  LEFT_INDEX: 19,
  RIGHT_INDEX: 20,
  LEFT_THUMB: 21,
  RIGHT_THUMB: 22,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
  LEFT_HEEL: 29,
  RIGHT_HEEL: 30,
  LEFT_FOOT_INDEX: 31,
  RIGHT_FOOT_INDEX: 32,
};

// ============================================
// TECHNIQUE TEMPLATES
// ============================================

const techniqueTemplates: Record<string, TechniqueTemplate> = {
  'jab-cross': {
    name: 'Jab-Cross Combination',
    angles: {
      leadElbow: { min: 150, max: 180, weight: 1.2, label: 'Lead arm extension' },
      rearElbow: { min: 35, max: 100, weight: 1.0, label: 'Rear guard position' },
      leadShoulder: { min: 70, max: 140, weight: 0.9, label: 'Lead shoulder engagement' },
      rearShoulder: { min: 20, max: 70, weight: 0.8, label: 'Rear shoulder guard' },
      leadKnee: { min: 150, max: 178, weight: 0.7, label: 'Lead leg stability' },
      rearKnee: { min: 135, max: 170, weight: 0.7, label: 'Rear leg drive' },
      hipAngle: { min: 150, max: 180, weight: 1.0, label: 'Hip engagement' },
    },
    bodyPartMapping: {
      'Head': { angleName: 'headPosition', idealDesc: 'Chin tucked, eyes forward' },
      'Shoulders': { angleName: 'leadShoulder', idealDesc: 'Good rotation on cross' },
      'Lead Arm': { angleName: 'leadElbow', idealDesc: 'Full extension on jab' },
      'Rear Arm': { angleName: 'rearElbow', idealDesc: 'Guard protecting face' },
      'Core': { angleName: 'hipAngle', idealDesc: 'Engaged and stable' },
      'Hips': { angleName: 'hipRotation', idealDesc: 'Rotating to generate power' },
      'Lead Leg': { angleName: 'leadKnee', idealDesc: 'Proper weight distribution' },
      'Rear Leg': { angleName: 'rearKnee', idealDesc: 'Pivoting on ball of foot' },
    },
  },
  'hook': {
    name: 'Lead Hook',
    angles: {
      leadElbow: { min: 75, max: 110, weight: 1.3, label: 'Lead hook angle' },
      rearElbow: { min: 35, max: 90, weight: 1.0, label: 'Rear guard position' },
      leadShoulder: { min: 60, max: 120, weight: 1.1, label: 'Shoulder rotation' },
      rearShoulder: { min: 20, max: 60, weight: 0.8, label: 'Rear guard' },
      leadKnee: { min: 140, max: 175, weight: 0.7, label: 'Lead leg stability' },
      rearKnee: { min: 130, max: 165, weight: 0.7, label: 'Rear leg pivot' },
      hipAngle: { min: 140, max: 178, weight: 1.1, label: 'Hip rotation for power' },
    },
    bodyPartMapping: {
      'Head': { angleName: 'headPosition', idealDesc: 'Chin tucked behind shoulder' },
      'Shoulders': { angleName: 'leadShoulder', idealDesc: 'Full rotation into hook' },
      'Lead Arm': { angleName: 'leadElbow', idealDesc: 'Elbow at 90 degrees' },
      'Rear Arm': { angleName: 'rearElbow', idealDesc: 'Guard up protecting face' },
      'Core': { angleName: 'hipAngle', idealDesc: 'Rotating powerfully' },
      'Hips': { angleName: 'hipRotation', idealDesc: 'Full hip rotation' },
      'Lead Leg': { angleName: 'leadKnee', idealDesc: 'Stable base' },
      'Rear Leg': { angleName: 'rearKnee', idealDesc: 'Pivoting for power' },
    },
  },
  'kick': {
    name: 'Roundhouse Kick',
    angles: {
      leadElbow: { min: 30, max: 90, weight: 0.7, label: 'Lead arm balance' },
      rearElbow: { min: 30, max: 90, weight: 0.7, label: 'Rear arm balance' },
      leadShoulder: { min: 40, max: 100, weight: 0.8, label: 'Upper body lean' },
      leadKnee: { min: 120, max: 175, weight: 1.2, label: 'Kicking leg extension' },
      rearKnee: { min: 140, max: 175, weight: 1.0, label: 'Plant leg stability' },
      hipAngle: { min: 120, max: 170, weight: 1.3, label: 'Hip turnover' },
    },
    bodyPartMapping: {
      'Head': { angleName: 'headPosition', idealDesc: 'Eyes on target' },
      'Shoulders': { angleName: 'leadShoulder', idealDesc: 'Counter-rotation for balance' },
      'Lead Arm': { angleName: 'leadElbow', idealDesc: 'Swinging for momentum' },
      'Rear Arm': { angleName: 'rearElbow', idealDesc: 'Guard position maintained' },
      'Core': { angleName: 'hipAngle', idealDesc: 'Hip turning over fully' },
      'Hips': { angleName: 'hipRotation', idealDesc: 'Full hip turnover' },
      'Lead Leg': { angleName: 'leadKnee', idealDesc: 'Extending through target' },
      'Rear Leg': { angleName: 'rearKnee', idealDesc: 'Pivoting on ball of foot' },
    },
  },
  'defense': {
    name: 'Slip & Counter',
    angles: {
      leadElbow: { min: 40, max: 100, weight: 1.0, label: 'Lead guard tight' },
      rearElbow: { min: 40, max: 100, weight: 1.0, label: 'Rear guard tight' },
      leadShoulder: { min: 30, max: 80, weight: 0.9, label: 'Shoulder protection' },
      rearShoulder: { min: 30, max: 80, weight: 0.9, label: 'Shoulder protection' },
      leadKnee: { min: 120, max: 160, weight: 1.1, label: 'Knee bend for slip' },
      rearKnee: { min: 120, max: 160, weight: 1.1, label: 'Knee bend for level change' },
      hipAngle: { min: 130, max: 170, weight: 0.8, label: 'Waist bend' },
    },
    bodyPartMapping: {
      'Head': { angleName: 'headPosition', idealDesc: 'Moving off center line' },
      'Shoulders': { angleName: 'leadShoulder', idealDesc: 'Rolled for protection' },
      'Lead Arm': { angleName: 'leadElbow', idealDesc: 'Tight guard position' },
      'Rear Arm': { angleName: 'rearElbow', idealDesc: 'Tight guard position' },
      'Core': { angleName: 'hipAngle', idealDesc: 'Bending at waist' },
      'Hips': { angleName: 'hipRotation', idealDesc: 'Level change from hips' },
      'Lead Leg': { angleName: 'leadKnee', idealDesc: 'Bent for level change' },
      'Rear Leg': { angleName: 'rearKnee', idealDesc: 'Bent for stability' },
    },
  },
};

// ============================================
// ANGLE CALCULATION
// ============================================

/**
 * Calculate angle at vertex point B formed by points A-B-C (in degrees)
 */
function calcAngle(
  a: { x: number; y: number },
  b: { x: number; y: number },
  c: { x: number; y: number }
): number {
  const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let angle = Math.abs(radians * 180.0 / Math.PI);
  if (angle > 180) angle = 360 - angle;
  return Math.round(angle * 10) / 10;
}

/**
 * Calculate all relevant joint angles from pose landmarks
 */
function calculateAngles(landmarks: PoseLandmark[]): JointAngles {
  const lm = (idx: number) => landmarks[idx];

  // Elbow angles (shoulder-elbow-wrist)
  const leftElbow = calcAngle(lm(LM.LEFT_SHOULDER), lm(LM.LEFT_ELBOW), lm(LM.LEFT_WRIST));
  const rightElbow = calcAngle(lm(LM.RIGHT_SHOULDER), lm(LM.RIGHT_ELBOW), lm(LM.RIGHT_WRIST));

  // Shoulder angles (hip-shoulder-elbow)
  const leftShoulder = calcAngle(lm(LM.LEFT_HIP), lm(LM.LEFT_SHOULDER), lm(LM.LEFT_ELBOW));
  const rightShoulder = calcAngle(lm(LM.RIGHT_HIP), lm(LM.RIGHT_SHOULDER), lm(LM.RIGHT_ELBOW));

  // Hip angles (shoulder-hip-knee)
  const leftHip = calcAngle(lm(LM.LEFT_SHOULDER), lm(LM.LEFT_HIP), lm(LM.LEFT_KNEE));
  const rightHip = calcAngle(lm(LM.RIGHT_SHOULDER), lm(LM.RIGHT_HIP), lm(LM.RIGHT_KNEE));

  // Knee angles (hip-knee-ankle)
  const leftKnee = calcAngle(lm(LM.LEFT_HIP), lm(LM.LEFT_KNEE), lm(LM.LEFT_ANKLE));
  const rightKnee = calcAngle(lm(LM.RIGHT_HIP), lm(LM.RIGHT_KNEE), lm(LM.RIGHT_ANKLE));

  // Hip rotation approximation: angle difference between left and right shoulder X positions
  // relative to hip center
  const shoulderDx = Math.abs(lm(LM.LEFT_SHOULDER).x - lm(LM.RIGHT_SHOULDER).x);
  const hipDx = Math.abs(lm(LM.LEFT_HIP).x - lm(LM.RIGHT_HIP).x);
  const hipRotation = Math.round(Math.abs(shoulderDx - hipDx) * 180 * 10) / 10;

  // Head position: nose Y relative to shoulder midpoint Y (lower = more tucked)
  const shoulderMidY = (lm(LM.LEFT_SHOULDER).y + lm(LM.RIGHT_SHOULDER).y) / 2;
  const headPosition = Math.round((shoulderMidY - lm(LM.NOSE).y) * 100 * 10) / 10;

  return {
    leftElbow,
    rightElbow,
    leftShoulder,
    rightShoulder,
    leftHip,
    rightHip,
    leftKnee,
    rightKnee,
    hipRotation,
    headPosition,
  };
}

// ============================================
// SCORING
// ============================================

/**
 * Score a single angle against its ideal range (0-100)
 */
function scoreAngle(actual: number, range: AngleRange): number {
  if (actual >= range.min && actual <= range.max) {
    return 100; // Perfect - within ideal range
  }

  // Calculate distance from nearest edge of ideal range
  const distFromIdeal = actual < range.min
    ? range.min - actual
    : actual - range.max;

  // Score decreases linearly: ~5 points per degree of deviation
  // Max deviation of 40 degrees = score of 0
  const score = Math.max(0, 100 - (distFromIdeal * 2.5));
  return Math.round(score);
}

/**
 * Map angle names to actual angle values (handling lead/rear side detection)
 */
function getAngleValue(angleName: string, angles: JointAngles): number {
  // Determine lead side based on stance (left shoulder forward = orthodox)
  const isOrthodox = angles.leftShoulder > angles.rightShoulder;

  const mapping: Record<string, number> = {
    leadElbow: isOrthodox ? angles.leftElbow : angles.rightElbow,
    rearElbow: isOrthodox ? angles.rightElbow : angles.leftElbow,
    leadShoulder: isOrthodox ? angles.leftShoulder : angles.rightShoulder,
    rearShoulder: isOrthodox ? angles.rightShoulder : angles.leftShoulder,
    leadKnee: isOrthodox ? angles.leftKnee : angles.rightKnee,
    rearKnee: isOrthodox ? angles.rightKnee : angles.leftKnee,
    leadHip: isOrthodox ? angles.leftHip : angles.rightHip,
    rearHip: isOrthodox ? angles.rightHip : angles.leftHip,
    hipAngle: (angles.leftHip + angles.rightHip) / 2,
    hipRotation: angles.hipRotation,
    headPosition: angles.headPosition,
  };

  return mapping[angleName] ?? 0;
}

/**
 * Score a frame against a technique template
 */
function scoreFrame(angles: JointAngles, template: TechniqueTemplate): Record<string, number> {
  const scores: Record<string, number> = {};

  for (const [name, range] of Object.entries(template.angles)) {
    const actual = getAngleValue(name, angles);
    scores[name] = scoreAngle(actual, range);
  }

  return scores;
}

// ============================================
// CATEGORY SCORING
// ============================================

/**
 * Group angle scores into the 4 scoring categories
 */
function getCategoryScores(
  scores: Record<string, number>,
  template: TechniqueTemplate
): { category: string; score: number; maxScore: number; tips: string[] }[] {
  const categories: Record<string, { scores: number[]; tips: string[] }> = {
    'Stance & Balance': { scores: [], tips: [] },
    'Hip Rotation': { scores: [], tips: [] },
    'Guard Position': { scores: [], tips: [] },
    'Extension & Reach': { scores: [], tips: [] },
  };

  // Map angles to categories
  for (const [name, score] of Object.entries(scores)) {
    const range = template.angles[name];
    if (!range) continue;

    if (name.includes('Knee') || name === 'hipAngle') {
      categories['Stance & Balance'].scores.push(score);
      if (score < 70) categories['Stance & Balance'].tips.push(`Improve ${range.label} (score: ${score}%)`);
    }
    if (name.includes('hipRotation') || name === 'hipAngle') {
      categories['Hip Rotation'].scores.push(score);
      if (score < 70) categories['Hip Rotation'].tips.push(`Improve ${range.label}`);
    }
    if (name.includes('rearElbow') || name.includes('rearShoulder')) {
      categories['Guard Position'].scores.push(score);
      if (score < 70) categories['Guard Position'].tips.push(`Improve ${range.label}`);
    }
    if (name.includes('leadElbow') || name.includes('leadShoulder')) {
      categories['Extension & Reach'].scores.push(score);
      if (score < 70) categories['Extension & Reach'].tips.push(`Improve ${range.label}`);
    }
  }

  // Default tips for good scores
  const defaultTips: Record<string, string[]> = {
    'Stance & Balance': ['Good base width maintained', 'Weight distribution is solid', 'Center of gravity is appropriate'],
    'Hip Rotation': ['Good initiation from the ground', 'Hip engagement present', 'Follow through is developing'],
    'Guard Position': ['Hands in good position', 'Chin tucked properly', 'Return to guard after strikes'],
    'Extension & Reach': ['Good extension observed', 'Shoulder rotation present', 'Range is consistent'],
  };

  return Object.entries(categories).map(([category, data]) => {
    const avg = data.scores.length > 0
      ? Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length)
      : 50;

    const tips = data.tips.length > 0
      ? data.tips.slice(0, 3)
      : defaultTips[category]?.slice(0, 2) || ['Good form observed'];

    return { category, score: avg, maxScore: 100, tips };
  });
}

// ============================================
// BODY PART FEEDBACK
// ============================================

function getBodyPartFeedback(
  avgScores: Record<string, number>,
  avgAngles: JointAngles,
  template: TechniqueTemplate
): { part: string; status: 'correct' | 'needs-work' | 'incorrect'; angle?: number; feedback: string }[] {
  return Object.entries(template.bodyPartMapping).map(([part, { angleName, idealDesc }]) => {
    const score = avgScores[angleName] ?? 75;
    const angle = Math.round(getAngleValue(angleName, avgAngles));

    let status: 'correct' | 'needs-work' | 'incorrect';
    let feedback: string;

    if (score >= 80) {
      status = 'correct';
      feedback = idealDesc;
    } else if (score >= 50) {
      status = 'needs-work';
      const range = template.angles[angleName];
      if (range) {
        feedback = `${idealDesc} - adjust angle (currently ${angle}°, ideal: ${range.min}-${range.max}°)`;
      } else {
        feedback = `${idealDesc} - needs minor adjustment`;
      }
    } else {
      status = 'incorrect';
      feedback = `Significant correction needed for ${part.toLowerCase()}`;
    }

    return {
      part,
      status,
      angle: angleName !== 'headPosition' && angleName !== 'hipRotation' ? angle : undefined,
      feedback,
    };
  });
}

// ============================================
// KEY MOMENTS DETECTION
// ============================================

function detectKeyMoments(
  frameResults: FrameResult[]
): { timestamp: string; description: string; type: 'positive' | 'negative' | 'neutral' }[] {
  const moments: { timestamp: string; description: string; type: 'positive' | 'negative' | 'neutral' }[] = [];

  for (let i = 1; i < frameResults.length; i++) {
    const curr = frameResults[i];
    const prev = frameResults[i - 1];
    const ts = formatTimestamp(curr.timestamp);

    if (!curr.angles || !prev.angles) continue;

    const scoreDiff = curr.overallScore - prev.overallScore;

    // Detect significant changes
    if (scoreDiff > 10) {
      moments.push({
        timestamp: ts,
        description: 'Form improved significantly',
        type: 'positive',
      });
    } else if (scoreDiff < -10) {
      moments.push({
        timestamp: ts,
        description: 'Form dropped - check technique',
        type: 'negative',
      });
    }

    // Check specific angle improvements/regressions
    if (curr.scores && prev.scores) {
      for (const [name, score] of Object.entries(curr.scores)) {
        const prevScore = prev.scores[name] ?? 0;
        if (score >= 90 && prevScore < 80) {
          moments.push({ timestamp: ts, description: `Excellent ${name} achieved`, type: 'positive' });
        }
        if (score < 50 && prevScore >= 60) {
          moments.push({ timestamp: ts, description: `${name} needs correction`, type: 'negative' });
        }
      }
    }
  }

  // Add start and end observations
  if (frameResults.length > 0 && frameResults[0].overallScore > 0) {
    const first = frameResults[0];
    moments.unshift({
      timestamp: formatTimestamp(first.timestamp),
      description: first.overallScore >= 70 ? 'Good starting position' : 'Adjust starting stance',
      type: first.overallScore >= 70 ? 'positive' : 'neutral',
    });
  }

  // Limit to 8 most significant moments
  return moments.slice(0, 8);
}

function formatTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// ============================================
// MEDIAPIPE INITIALIZATION
// ============================================

let poseLandmarkerInstance: any = null;

/**
 * Initialize MediaPipe Pose Landmarker
 * Loads the model from Google CDN
 */
export async function initPoseDetection(): Promise<any> {
  if (poseLandmarkerInstance) return poseLandmarkerInstance;

  const { PoseLandmarker, FilesetResolver } = await import('@mediapipe/tasks-vision');

  const vision = await FilesetResolver.forVisionTasks(
    'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
  );

  poseLandmarkerInstance = await PoseLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath:
        'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
      delegate: 'GPU',
    },
    runningMode: 'VIDEO',
    numPoses: 1,
  });

  return poseLandmarkerInstance;
}

// ============================================
// MAIN ANALYSIS FUNCTION
// ============================================

/**
 * Analyze a video for form correction
 * Processes frames at ~2fps, extracts pose, calculates scores
 */
export async function analyzeVideo(
  videoElement: HTMLVideoElement,
  technique: string,
  onProgress?: (progress: number) => void
): Promise<AnalysisResult> {
  const template = techniqueTemplates[technique] || techniqueTemplates['jab-cross'];

  // Initialize pose detection
  const landmarker = await initPoseDetection();

  const duration = videoElement.duration;
  const sampleInterval = 0.5; // Sample every 0.5 seconds
  const totalFrames = Math.floor(duration / sampleInterval);
  const frameResults: FrameResult[] = [];

  // Process frames
  for (let i = 0; i <= totalFrames; i++) {
    const timestamp = i * sampleInterval;

    // Seek video to timestamp
    videoElement.currentTime = timestamp;
    await waitForSeek(videoElement);

    // Small delay to ensure frame is rendered
    await new Promise(resolve => setTimeout(resolve, 50));

    // Detect pose
    try {
      const result = landmarker.detectForVideo(videoElement, performance.now());

      if (result.landmarks && result.landmarks.length > 0) {
        const landmarks: PoseLandmark[] = result.landmarks[0].map((lm: any) => ({
          x: lm.x,
          y: lm.y,
          z: lm.z,
          visibility: lm.visibility ?? 1,
        }));

        const angles = calculateAngles(landmarks);
        const scores = scoreFrame(angles, template);
        const weightedScores = Object.entries(scores).map(([name, score]) => {
          const weight = template.angles[name]?.weight ?? 1;
          return score * weight;
        });
        const totalWeight = Object.values(template.angles).reduce((sum, r) => sum + r.weight, 0);
        const overallScore = Math.round(
          weightedScores.reduce((a, b) => a + b, 0) / totalWeight
        );

        frameResults.push({ timestamp, landmarks, angles, scores, overallScore });
      } else {
        frameResults.push({ timestamp, landmarks: null, angles: null, scores: {}, overallScore: 0 });
      }
    } catch {
      frameResults.push({ timestamp, landmarks: null, angles: null, scores: {}, overallScore: 0 });
    }

    // Report progress
    onProgress?.(Math.round(((i + 1) / (totalFrames + 1)) * 100));
  }

  // Filter frames where pose was detected
  const validFrames = frameResults.filter(f => f.angles !== null);
  const poseDetected = validFrames.length > 0;

  if (!poseDetected) {
    return getFallbackResult(technique, template.name);
  }

  // Average scores across frames
  const avgScores: Record<string, number> = {};
  for (const name of Object.keys(template.angles)) {
    const scores = validFrames.map(f => f.scores[name] ?? 0);
    avgScores[name] = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  }

  // Average angles
  const avgAngles: JointAngles = {
    leftElbow: avg(validFrames.map(f => f.angles!.leftElbow)),
    rightElbow: avg(validFrames.map(f => f.angles!.rightElbow)),
    leftShoulder: avg(validFrames.map(f => f.angles!.leftShoulder)),
    rightShoulder: avg(validFrames.map(f => f.angles!.rightShoulder)),
    leftHip: avg(validFrames.map(f => f.angles!.leftHip)),
    rightHip: avg(validFrames.map(f => f.angles!.rightHip)),
    leftKnee: avg(validFrames.map(f => f.angles!.leftKnee)),
    rightKnee: avg(validFrames.map(f => f.angles!.rightKnee)),
    hipRotation: avg(validFrames.map(f => f.angles!.hipRotation)),
    headPosition: avg(validFrames.map(f => f.angles!.headPosition)),
  };

  // Calculate weighted overall score
  const totalWeight = Object.values(template.angles).reduce((sum, r) => sum + r.weight, 0);
  const weightedAvg = Object.entries(avgScores).reduce((sum, [name, score]) => {
    const weight = template.angles[name]?.weight ?? 1;
    return sum + score * weight;
  }, 0);
  const overallScore = Math.round(weightedAvg / totalWeight);

  return {
    technique,
    techniqueName: template.name,
    overallScore,
    result: overallScore >= 60 ? 'Good' : 'Needs Improvement',
    breakdown: getCategoryScores(avgScores, template),
    bodyParts: getBodyPartFeedback(avgScores, avgAngles, template),
    keyMoments: detectKeyMoments(frameResults),
    frameCount: validFrames.length,
    poseDetected: true,
  };
}

// ============================================
// CANVAS DRAWING (for skeleton overlay)
// ============================================

export function drawPoseOnCanvas(
  canvas: HTMLCanvasElement,
  landmarks: PoseLandmark[],
  videoWidth: number,
  videoHeight: number
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  canvas.width = videoWidth;
  canvas.height = videoHeight;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Connection definitions
  const connections = [
    // Torso
    [LM.LEFT_SHOULDER, LM.RIGHT_SHOULDER],
    [LM.LEFT_SHOULDER, LM.LEFT_HIP],
    [LM.RIGHT_SHOULDER, LM.RIGHT_HIP],
    [LM.LEFT_HIP, LM.RIGHT_HIP],
    // Left arm
    [LM.LEFT_SHOULDER, LM.LEFT_ELBOW],
    [LM.LEFT_ELBOW, LM.LEFT_WRIST],
    // Right arm
    [LM.RIGHT_SHOULDER, LM.RIGHT_ELBOW],
    [LM.RIGHT_ELBOW, LM.RIGHT_WRIST],
    // Left leg
    [LM.LEFT_HIP, LM.LEFT_KNEE],
    [LM.LEFT_KNEE, LM.LEFT_ANKLE],
    // Right leg
    [LM.RIGHT_HIP, LM.RIGHT_KNEE],
    [LM.RIGHT_KNEE, LM.RIGHT_ANKLE],
    // Head
    [LM.LEFT_SHOULDER, LM.NOSE],
    [LM.RIGHT_SHOULDER, LM.NOSE],
  ];

  // Draw connections
  for (const [start, end] of connections) {
    const a = landmarks[start];
    const b = landmarks[end];
    if (a.visibility < 0.5 || b.visibility < 0.5) continue;

    ctx.beginPath();
    ctx.moveTo(a.x * videoWidth, a.y * videoHeight);
    ctx.lineTo(b.x * videoWidth, b.y * videoHeight);
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  // Draw keypoints
  const keypoints = [
    LM.NOSE, LM.LEFT_SHOULDER, LM.RIGHT_SHOULDER,
    LM.LEFT_ELBOW, LM.RIGHT_ELBOW, LM.LEFT_WRIST, LM.RIGHT_WRIST,
    LM.LEFT_HIP, LM.RIGHT_HIP, LM.LEFT_KNEE, LM.RIGHT_KNEE,
    LM.LEFT_ANKLE, LM.RIGHT_ANKLE,
  ];

  for (const idx of keypoints) {
    const lm = landmarks[idx];
    if (lm.visibility < 0.5) continue;

    ctx.beginPath();
    ctx.arc(lm.x * videoWidth, lm.y * videoHeight, 5, 0, 2 * Math.PI);
    ctx.fillStyle = '#ef4444';
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

// ============================================
// HELPERS
// ============================================

function avg(nums: number[]): number {
  return nums.length > 0 ? Math.round(nums.reduce((a, b) => a + b, 0) / nums.length * 10) / 10 : 0;
}

function waitForSeek(video: HTMLVideoElement): Promise<void> {
  return new Promise(resolve => {
    const onSeeked = () => {
      video.removeEventListener('seeked', onSeeked);
      resolve();
    };
    video.addEventListener('seeked', onSeeked);
    // Timeout fallback
    setTimeout(resolve, 500);
  });
}

function getFallbackResult(technique: string, techniqueName: string): AnalysisResult {
  return {
    technique,
    techniqueName,
    overallScore: 0,
    result: 'Needs Improvement',
    breakdown: [
      { category: 'Stance & Balance', score: 0, maxScore: 100, tips: ['Could not detect pose - ensure full body is visible'] },
      { category: 'Hip Rotation', score: 0, maxScore: 100, tips: ['Try recording in better lighting'] },
      { category: 'Guard Position', score: 0, maxScore: 100, tips: ['Stand further from camera'] },
      { category: 'Extension & Reach', score: 0, maxScore: 100, tips: ['Ensure camera captures your full body'] },
    ],
    bodyParts: [
      { part: 'Full Body', status: 'incorrect', feedback: 'Pose could not be detected. Please ensure your full body is visible in the video with good lighting.' },
    ],
    keyMoments: [],
    frameCount: 0,
    poseDetected: false,
  };
}

/**
 * Get available technique templates
 */
export function getAvailableTechniques(): { id: string; name: string }[] {
  return Object.entries(techniqueTemplates).map(([id, template]) => ({
    id,
    name: template.name,
  }));
}
