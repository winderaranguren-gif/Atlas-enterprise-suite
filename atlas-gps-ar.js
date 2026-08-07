(() => {
  'use strict';

  const FRAME_WIDTH = 320;
  const FRAME_HEIGHT = 180;
  const FRAME_INTERVAL_MS = 220;
  const STORAGE_KEY = 'atlas-gps-ar-calibration-v1';

  const state = {
    worker: null,
    captureCanvas: null,
    captureContext: null,
    overlay: null,
    overlayContext: null,
    timer: null,
    frameId: 0,
    pending: false,
    calibration: loadCalibration(),
    lastResult: null
  };

  function loadCalibration() {
    try {
      return { horizon: 0.48, cameraOffsetX: 0, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') };
    } catch {
      return { horizon: 0.48, cameraOffsetX: 0 };
    }
  }

  function saveCalibration() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.calibration));
  }

  function setupOverlay(stage) {
    const canvas = document.createElement('canvas');
    canvas.className = 'atlas-ar-overlay';
    canvas.setAttribute('aria-hidden', 'true');
    stage.appendChild(canvas);
    state.overlay = canvas;
    state.overlayContext = canvas.getContext('2d');

    const badge = document.createElement('div');
    badge.className = 'atlas-ar-badge glass';
    badge.innerHTML = '<strong>AR LOCAL</strong><span id="atlas-ar-status">WAITING FOR CAMERA</span>';
    stage.appendChild(badge);

    const calibrate = document.createElement('button');
    calibrate.type = 'button';
    calibrate.className = 'atlas-ar-calibrate glass';
    calibrate.textContent = 'CALIBRATE AR';
    calibrate.addEventListener('click', () => {
      state.calibration.horizon = state.lastResult?.lane?.confidence > 0.25 ? 0.46 : 0.5;
      state.calibration.cameraOffsetX = state.lastResult?.lane?.offsetNormalized || 0;
      saveCalibration();
      updateStatus('CALIBRATED ON DEVICE');
    });
    stage.appendChild(calibrate);

    const resize = () => {
      const rect = stage.getBoundingClientRect();
      const ratio = Math.max(1, window.devicePixelRatio || 1);
      canvas.width = Math.round(rect.width * ratio);
      canvas.height = Math.round(rect.height * ratio);
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      state.overlayContext.setTransform(ratio, 0, 0, ratio, 0, 0);
      draw(state.lastResult);
    };
    new ResizeObserver(resize).observe(stage);
    resize();
  }

  function updateStatus(text, danger = false) {
    const status = document.getElementById('atlas-ar-status');
    if (!status) return;
    status.textContent = text;
    status.classList.toggle('danger', danger);
  }

  function draw(result) {
    const canvas = state.overlay;
    const context = state.overlayContext;
    if (!canvas || !context) return;
    const rect = canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    context.clearRect(0, 0, width, height);
    if (!result) return;

    const lane = result.lane;
    const horizonY = height * state.calibration.horizon;
    const bottomY = height * 0.98;
    const leftBottom = width * lane.leftX;
    const rightBottom = width * lane.rightX;
    const vanishingX = width * (0.5 + state.calibration.cameraOffsetX * 0.08);

    context.save();
    context.lineCap = 'round';
    context.shadowBlur = 18;
    context.shadowColor = 'rgba(41, 215, 255, .9)';
    context.strokeStyle = `rgba(41, 215, 255, ${0.3 + lane.confidence * 0.7})`;
    context.lineWidth = 5;
    context.beginPath();
    context.moveTo(leftBottom, bottomY);
    context.lineTo(vanishingX - width * 0.04, horizonY);
    context.moveTo(rightBottom, bottomY);
    context.lineTo(vanishingX + width * 0.04, horizonY);
    context.stroke();

    context.setLineDash([18, 18]);
    context.lineWidth = 3;
    context.beginPath();
    context.moveTo((leftBottom + rightBottom) / 2, bottomY);
    context.lineTo(vanishingX, horizonY);
    context.stroke();
    context.setLineDash([]);

    if (Math.abs(lane.offsetNormalized) > 0.48 && lane.confidence > 0.3) {
      context.fillStyle = 'rgba(255, 174, 66, .92)';
      context.font = '700 18px system-ui';
      context.textAlign = 'center';
      context.fillText(lane.offsetNormalized > 0 ? 'CENTER VEHICLE LEFT' : 'CENTER VEHICLE RIGHT', width / 2, height * 0.72);
    }

    if (result.motion.obstacleRisk > 0.66) {
      context.fillStyle = 'rgba(255, 76, 107, .94)';
      context.font = '800 21px system-ui';
      context.fillText('CHECK ROAD AHEAD', width / 2, height * 0.62);
    }
    context.restore();
  }

  function capture(video) {
    if (state.pending || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || video.videoWidth < 2) return;
    state.pending = true;
    state.captureContext.drawImage(video, 0, 0, FRAME_WIDTH, FRAME_HEIGHT);
    const frame = state.captureContext.getImageData(0, 0, FRAME_WIDTH, FRAME_HEIGHT);
    const id = ++state.frameId;
    state.worker.postMessage({
      type: 'frame',
      id,
      width: FRAME_WIDTH,
      height: FRAME_HEIGHT,
      pixels: frame.data.buffer
    }, [frame.data.buffer]);
  }

  function start() {
    const video = document.getElementById('road-camera');
    const stage = document.querySelector('.camera-stage');
    if (!video || !stage || !window.Worker) return;

    setupOverlay(stage);
    state.captureCanvas = document.createElement('canvas');
    state.captureCanvas.width = FRAME_WIDTH;
    state.captureCanvas.height = FRAME_HEIGHT;
    state.captureContext = state.captureCanvas.getContext('2d', { willReadFrequently: true });
    state.worker = new Worker('atlas-gps-ar-worker.js');
    state.worker.onmessage = (event) => {
      state.pending = false;
      if (event.data?.type !== 'analysis') return;
      state.lastResult = event.data.result;
      draw(state.lastResult);
      const risk = state.lastResult.motion.obstacleRisk;
      const confidence = state.lastResult.lane.confidence;
      updateStatus(
        risk > 0.66 ? 'POSSIBLE MOVING OBSTACLE' : confidence > 0.25 ? `LANE ${Math.round(confidence * 100)}%` : 'LANE SEARCH',
        risk > 0.66
      );
      window.dispatchEvent(new CustomEvent('atlas-ar-analysis', { detail: state.lastResult }));
    };
    state.worker.onerror = () => {
      state.pending = false;
      updateStatus('AR ANALYSIS UNAVAILABLE', true);
    };
    state.timer = window.setInterval(() => capture(video), FRAME_INTERVAL_MS);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) state.worker?.postMessage({ type: 'reset' });
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
