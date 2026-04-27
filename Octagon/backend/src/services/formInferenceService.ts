import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

export interface FormModelInferenceResult {
  action: string;
  confidence: number;
  score: number;
  components: Record<string, number>;
  feedback: string[];
  frames: number;
  telemetry?: {
    avg_landmark_confidence?: number;
    avg_visible_landmarks?: number;
    visible_landmark_ratio?: number;
    preview_keypoints?: Array<{ x: number; y: number; confidence: number }>;
    angles?: Record<string, number>;
  };
}

function getBackendRoot(): string {
  return path.resolve(__dirname, '..', '..', '..');
}

function getProjectRoot(): string {
  return path.resolve(getBackendRoot(), '..');
}

function extractJsonBlob(stdout: string): string {
  const start = stdout.indexOf('{');
  const end = stdout.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('Model output did not contain JSON');
  }
  return stdout.slice(start, end + 1);
}

function resolvePythonBin(): string {
  if (process.env.PYTHON_BIN) {
    return process.env.PYTHON_BIN;
  }

  const projectRoot = getProjectRoot();
  const venvPythonWindows = path.join(projectRoot, '.venv', 'Scripts', 'python.exe');
  const venvPythonUnix = path.join(projectRoot, '.venv', 'bin', 'python');

  if (fs.existsSync(venvPythonWindows)) {
    return venvPythonWindows;
  }
  if (fs.existsSync(venvPythonUnix)) {
    return venvPythonUnix;
  }

  return 'python';
}

function resolveModelPath(): string {
  const projectRoot = getProjectRoot();
  return process.env.FORM_MODEL_PATH || path.join(projectRoot, 'Punch_DL', 'models', 'mma_strike_model.pt');
}

function resolveInferScriptPath(): string {
  const projectRoot = getProjectRoot();
  return path.join(projectRoot, 'Punch_DL', 'infer.py');
}

export async function analyzeFormVideoWithModel(
  videoPath: string,
  opts?: { frameStride?: number; maxFrames?: number }
): Promise<FormModelInferenceResult> {
  const inferScriptPath = resolveInferScriptPath();
  const modelPath = resolveModelPath();
  const pythonBin = resolvePythonBin();

  if (!fs.existsSync(videoPath)) {
    throw new Error(`Video not found: ${videoPath}`);
  }
  if (!fs.existsSync(inferScriptPath)) {
    throw new Error(`Inference script not found: ${inferScriptPath}`);
  }
  if (!fs.existsSync(modelPath)) {
    throw new Error(`Model not found: ${modelPath}`);
  }

  const punchDlRoot = path.dirname(inferScriptPath);
  const frameStride = opts?.frameStride ?? 2;
  const maxFrames = opts?.maxFrames ?? 180;

  const args = [
    inferScriptPath,
    '--video',
    videoPath,
    '--model',
    modelPath,
    '--frame-stride',
    String(frameStride),
    '--max-frames',
    String(maxFrames),
  ];

  return await new Promise<FormModelInferenceResult>((resolve, reject) => {
    const proc = spawn(pythonBin, args, {
      cwd: punchDlRoot,
      windowsHide: true,
      env: process.env,
    });

    let stdout = '';
    let stderr = '';

    const timeoutMs = 3 * 60 * 1000;
    const timeout = setTimeout(() => {
      proc.kill('SIGTERM');
      reject(new Error('Model inference timed out'));
    }, timeoutMs);

    proc.stdout.on('data', (chunk: Buffer | string) => {
      stdout += chunk.toString();
    });

    proc.stderr.on('data', (chunk: Buffer | string) => {
      stderr += chunk.toString();
    });

    proc.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });

    proc.on('close', (code) => {
      clearTimeout(timeout);
      if (code !== 0) {
        reject(new Error(`Model inference failed (exit ${code}): ${stderr || stdout}`));
        return;
      }

      try {
        const jsonText = extractJsonBlob(stdout.trim());
        const parsed = JSON.parse(jsonText) as FormModelInferenceResult;
        resolve(parsed);
      } catch (err) {
        reject(new Error(`Failed parsing model output: ${(err as Error).message}. Raw output: ${stdout}`));
      }
    });
  });
}
