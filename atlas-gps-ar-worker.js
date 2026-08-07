'use strict';

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function analyzeFrame({ width, height, pixels, previousGray }) {
  const data = new Uint8ClampedArray(pixels);
  const gray = new Uint8Array(width * height);
  const startY = Math.floor(height * 0.42);
  const center = width / 2;
  let leftScore = 0;
  let leftX = width * 0.25;
  let rightScore = 0;
  let rightX = width * 0.75;
  let motionPixels = 0;
  let motionTotal = 0;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      const offset = index * 4;
      const value = Math.round(data[offset] * 0.299 + data[offset + 1] * 0.587 + data[offset + 2] * 0.114);
      gray[index] = value;
      if (previousGray && previousGray.length === gray.length && y >= startY) {
        const difference = Math.abs(value - previousGray[index]);
        motionTotal += difference;
        if (difference > 36) motionPixels += 1;
      }
    }
  }

  for (let y = startY + 1; y < height - 1; y += 2) {
    const perspectiveWeight = 0.25 + 0.75 * ((y - startY) / Math.max(1, height - startY));
    for (let x = 2; x < width - 2; x += 2) {
      const index = y * width + x;
      const horizontalGradient = Math.abs(gray[index + 1] - gray[index - 1]);
      const verticalGradient = Math.abs(gray[index + width] - gray[index - width]);
      const brightness = gray[index];
      const edgeScore = (horizontalGradient * 0.7 + verticalGradient * 0.3) * perspectiveWeight;
      if (brightness < 125 || edgeScore < 42) continue;

      const distanceFromCenter = Math.abs(x - center) / center;
      const sideBias = clamp(distanceFromCenter, 0.15, 1);
      const score = edgeScore * sideBias;
      if (x < center && score > leftScore) {
        leftScore = score;
        leftX = x;
      } else if (x > center && score > rightScore) {
        rightScore = score;
        rightX = x;
      }
    }
  }

  const laneWidth = rightX - leftX;
  const laneCenter = (leftX + rightX) / 2;
  const confidence = clamp((leftScore + rightScore) / 340, 0, 1) * (laneWidth > width * 0.2 ? 1 : 0.35);
  const offsetNormalized = clamp((laneCenter - center) / Math.max(1, laneWidth / 2), -1, 1);
  const lowerPixels = width * Math.max(1, height - startY);
  const motionRatio = previousGray ? motionPixels / lowerPixels : 0;
  const motionStrength = previousGray ? motionTotal / (lowerPixels * 255) : 0;
  const obstacleRisk = clamp(motionRatio * 2.4 + motionStrength * 1.8, 0, 1);

  return {
    gray,
    result: {
      timestamp: Date.now(),
      lane: {
        leftX: leftX / width,
        rightX: rightX / width,
        centerX: laneCenter / width,
        offsetNormalized,
        confidence
      },
      motion: {
        ratio: motionRatio,
        strength: motionStrength,
        obstacleRisk
      }
    }
  };
}

let previousGray = null;

self.onmessage = (event) => {
  const message = event.data || {};
  if (message.type === 'reset') {
    previousGray = null;
    self.postMessage({ type: 'reset-complete' });
    return;
  }
  if (message.type !== 'frame') return;
  try {
    const analysis = analyzeFrame({
      width: message.width,
      height: message.height,
      pixels: message.pixels,
      previousGray
    });
    previousGray = analysis.gray;
    self.postMessage({ type: 'analysis', id: message.id, result: analysis.result });
  } catch (error) {
    self.postMessage({ type: 'error', id: message.id, message: error.message || 'AR analysis failed' });
  }
};
