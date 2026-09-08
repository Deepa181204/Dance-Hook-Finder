import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';

export type MotionSignature = {
  framesAnalyzed: number;
  trackedFrames: number;
  motionEnergy: number;
  upperBodyEnergy: number;
  lowerBodyEnergy: number;
  tempo: number;
  confidence: number;
};

type Point = { x: number; y: number; z?: number };

const WASM_URL =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm';
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';

let landmarkerPromise: Promise<PoseLandmarker> | null = null;

function getLandmarker() {
  if (!landmarkerPromise) {
    landmarkerPromise = FilesetResolver.forVisionTasks(WASM_URL).then((vision) =>
      PoseLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' },
        runningMode: 'VIDEO',
        numPoses: 1,
        minPoseDetectionConfidence: 0.5,
        minPosePresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      }),
    );
  }
  return landmarkerPromise;
}

function waitForEvent(
  target: EventTarget,
  eventName: string,
  timeoutMs = 12_000,
) {
  return new Promise<void>((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error(`Timed out waiting for video ${eventName}.`));
    }, timeoutMs);
    const onEvent = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error('The selected video could not be decoded.'));
    };
    const cleanup = () => {
      window.clearTimeout(timeout);
      target.removeEventListener(eventName, onEvent);
      target.removeEventListener('error', onError);
    };
    target.addEventListener(eventName, onEvent, { once: true });
    target.addEventListener('error', onError, { once: true });
  });
}

async function seekVideo(video: HTMLVideoElement, timestamp: number) {
  if (Math.abs(video.currentTime - timestamp) < 0.001) return;
  const seeked = waitForEvent(video, 'seeked');
  video.currentTime = timestamp;
  await seeked;
}

function averageSpeed(
  previous: Point[] | undefined,
  current: Point[],
  indexes: number[],
) {
  if (!previous) return 0;
  const speeds = indexes.map((index) => {
    const before = previous[index];
    const after = current[index];
    if (!before || !after) return 0;
    return Math.hypot(after.x - before.x, after.y - before.y);
  });
  return speeds.reduce((sum, speed) => sum + speed, 0) / speeds.length;
}

function clampPercent(value: number) {
  return Math.round(Math.max(0, Math.min(99, value)));
}

export async function analyzePoseVideo(
  sourceUrl: string,
  onProgress?: (progress: number) => void,
): Promise<MotionSignature> {
  const video = document.createElement('video');
  video.muted = true;
  video.playsInline = true;
  video.preload = 'metadata';
  video.src = sourceUrl;
  video.load();
  await waitForEvent(video, 'loadedmetadata');

  if (!Number.isFinite(video.duration) || video.duration <= 0) {
    throw new Error('The video has no readable duration.');
  }

  const landmarker = await getLandmarker();
  const frameCount = Math.min(18, Math.max(8, Math.ceil(video.duration * 3)));
  const upperIndexes = [11, 12, 13, 14, 15, 16];
  const lowerIndexes = [23, 24, 25, 26, 27, 28];
  let previousLandmarks: Point[] | undefined;
  const upperSpeeds: number[] = [];
  const lowerSpeeds: number[] = [];
  let trackedFrames = 0;

  for (let index = 0; index < frameCount; index += 1) {
    const timestamp = (video.duration * index) / Math.max(frameCount - 1, 1);
    await seekVideo(video, timestamp);
    const result = landmarker.detectForVideo(video, Math.round(timestamp * 1000));
    const landmarks = result.landmarks[0] as Point[] | undefined;
    if (landmarks) {
      trackedFrames += 1;
      upperSpeeds.push(averageSpeed(previousLandmarks, landmarks, upperIndexes));
      lowerSpeeds.push(averageSpeed(previousLandmarks, landmarks, lowerIndexes));
      previousLandmarks = landmarks;
    }
    onProgress?.(clampPercent(((index + 1) / frameCount) * 100));
  }

  video.removeAttribute('src');
  video.load();

  if (trackedFrames < 3) {
    throw new Error(
      'No clear full-body pose was found. Try a brighter clip with the dancer fully in frame.',
    );
  }

  const mean = (values: number[]) =>
    values.reduce((sum, value) => sum + value, 0) / Math.max(values.length, 1);
  const upperBodyEnergy = mean(upperSpeeds);
  const lowerBodyEnergy = mean(lowerSpeeds);
  const motionEnergy = mean([...upperSpeeds, ...lowerSpeeds]);
  const peaks = upperSpeeds.filter(
    (speed, index) => speed > (upperSpeeds[index - 1] ?? 0) && speed > (upperSpeeds[index + 1] ?? 0),
  ).length;
  const tempo = clampPercent((peaks / Math.max(upperSpeeds.length, 1)) * 220);
  const confidence = clampPercent(
    (trackedFrames / frameCount) * 65 + Math.min(35, motionEnergy * 500),
  );

  return {
    framesAnalyzed: frameCount,
    trackedFrames,
    motionEnergy: clampPercent(motionEnergy * 500),
    upperBodyEnergy: clampPercent(upperBodyEnergy * 500),
    lowerBodyEnergy: clampPercent(lowerBodyEnergy * 500),
    tempo,
    confidence,
  };
}

export function rankHookSteps<T extends { tags: string[]; popularity: number }>(
  signature: MotionSignature,
  steps: T[],
) {
  const upperHeavy = signature.upperBodyEnergy >= signature.lowerBodyEnergy;
  return [...steps].sort((a, b) => {
    const score = (step: T) => {
      let value = 0;
      if (upperHeavy && step.tags.some((tag) => ['arms', 'point', 'shoulders'].includes(tag))) {
        value += 3;
      }
      if (!upperHeavy && step.tags.some((tag) => ['footwork', 'traveling', 'stomp'].includes(tag))) {
        value += 3;
      }
      if (signature.motionEnergy > 55 && step.tags.some((tag) => ['bounce', 'viral', 'stomp'].includes(tag))) {
        value += 2;
      }
      if (signature.tempo > 50 && step.tags.some((tag) => ['party', 'pop', 'classic'].includes(tag))) {
        value += 1;
      }
      return value + step.popularity / 100;
    };
    return score(b) - score(a);
  });
}