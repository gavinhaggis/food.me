'use strict';

let codeReader = null;
let activeStream = null;
let torchEnabled = false;

// Debounce guard — Android fires the callback multiple times for the same code
let lastScannedCode = null;
let lastScannedAt = 0;
const SCAN_DEBOUNCE_MS = 2000;

// Ordered constraint attempts — Android frequently rejects `exact` environment
// and some devices reject width/height constraints too
const CONSTRAINT_LADDER = [
  { video: { facingMode: { exact: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } } },
  { video: { facingMode: 'environment',            width: { ideal: 1280 }, height: { ideal: 720 } } },
  { video: { facingMode: 'environment' } },
  { video: true },
];

async function startScanner(videoElementId, onSuccess, onError) {
  const videoEl = document.getElementById(videoElementId);
  if (!videoEl) {
    onError('unknown');
    return;
  }

  // Camera requires a secure context (https:// or localhost).
  // On plain http:// Android Chrome silently returns 'denied' before any
  // prompt — the user can't fix this in settings, the protocol is wrong.
  if (!window.isSecureContext) {
    onError('insecure_context');
    return;
  }

  // Permission check — some Android browsers don't support this API; catch gracefully
  const permResult = await navigator.permissions
    .query({ name: 'camera' })
    .catch(() => ({ state: 'prompt' }));

  if (permResult.state === 'denied') {
    onError('permission_denied');
    return;
  }

  // Acquire the MediaStream ourselves so we can cascade constraints on failure.
  // ZXing's decodeFromConstraints only attempts once and throws on any error.
  let stream = null;
  for (const constraints of CONSTRAINT_LADDER) {
    try {
      stream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('[foodme:scanner] stream acquired with constraints:', JSON.stringify(constraints.video));
      break;
    } catch (e) {
      const name = e.name || '';
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        onError('permission_denied');
        return;
      }
      if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
        onError('no_camera');
        return;
      }
      // OverconstrainedError, ConstraintNotSatisfiedError, NotReadableError —
      // try the next set of constraints
      console.warn('[foodme:scanner] constraint attempt failed:', name, '— trying next');
    }
  }

  if (!stream) {
    onError('no_camera');
    return;
  }

  // Attach stream to the video element ourselves before handing it to ZXing.
  // This avoids a race on Android where ZXing's internal assignment isn't
  // reflected in videoEl.srcObject when we check it.
  videoEl.srcObject = stream;
  videoEl.setAttribute('playsinline', '');
  videoEl.muted = true;
  activeStream = stream;

  try {
    await videoEl.play();
  } catch (playErr) {
    // Autoplay can be blocked — ZXing will retry internally
    console.warn('[foodme:scanner] initial play() blocked:', playErr.name);
  }

  // Build ZXing reader with relaxed hints for better mobile detection
  codeReader = new ZXing.BrowserMultiFormatReader();

  // Some ZXing builds don't expose NotFoundException on the namespace object;
  // normalise the check
  const isNotFoundException = (err) => {
    if (!err) return false;
    if (typeof ZXing !== 'undefined' && ZXing.NotFoundException && err instanceof ZXing.NotFoundException) return true;
    return err.name === 'NotFoundException' || (err.message || '').includes('No MultiFormat');
  };

  try {
    // decodeFromStream uses our already-acquired stream — skips ZXing's
    // own getUserMedia so it can't override our camera choice
    await codeReader.decodeFromStream(stream, videoEl, (result, err) => {
      if (result) {
        const code = result.getText();
        const now = Date.now();

        // Debounce: ignore repeated fires of the same code within 2 s
        if (code === lastScannedCode && now - lastScannedAt < SCAN_DEBOUNCE_MS) {
          return;
        }
        lastScannedCode = code;
        lastScannedAt = now;

        if (navigator.vibrate) navigator.vibrate(100);
        onSuccess(code);
      }
      if (err && !isNotFoundException(err)) {
        // Log once, not on every frame
        if (!err._logged) {
          err._logged = true;
          console.warn('[foodme:scanner] decode error:', err.name || err.message);
        }
      }
    });
  } catch (zxingErr) {
    // decodeFromStream may not exist in all 0.21.x builds — fall back
    console.warn('[foodme:scanner] decodeFromStream unavailable, falling back:', zxingErr.message);
    await _fallbackDecode(stream, videoEl, isNotFoundException, onSuccess, onError);
  }

  // Defer torch check: stream must be active before getCapabilities() works
  setTimeout(_updateTorchButton, 1200);
}

// Fallback for ZXing builds that don't have decodeFromStream
async function _fallbackDecode(stream, videoEl, isNotFoundException, onSuccess, onError) {
  try {
    // decodeFromVideoDevice with null deviceId accepts any camera;
    // we've already attached our stream so the video is live
    await codeReader.decodeFromVideoDevice(null, videoEl, (result, err) => {
      if (result) {
        const code = result.getText();
        const now = Date.now();
        if (code === lastScannedCode && now - lastScannedAt < SCAN_DEBOUNCE_MS) return;
        lastScannedCode = code;
        lastScannedAt = now;
        if (navigator.vibrate) navigator.vibrate(100);
        onSuccess(code);
      }
      if (err && !isNotFoundException(err) && !err._logged) {
        err._logged = true;
        console.warn('[foodme:scanner] decode error (fallback):', err.name || err.message);
      }
    });
  } catch (e) {
    console.error('[foodme:scanner] all decode strategies failed', e);
    onError('unknown');
  }
}

function _updateTorchButton() {
  const torchBtn = document.getElementById('torch-btn');
  if (torchBtn && isTorchSupported()) {
    torchBtn.style.display = 'flex';
  }
}

function stopScanner() {
  try {
    if (codeReader) {
      codeReader.reset();
      codeReader = null;
    }
  } catch (e) {
    console.warn('[foodme:scanner] codeReader.reset() failed:', e.message);
  }

  try {
    if (activeStream) {
      activeStream.getTracks().forEach(t => t.stop());
      activeStream = null;
    }
  } catch (e) {
    console.warn('[foodme:scanner] stream stop failed:', e.message);
  }

  torchEnabled = false;
  lastScannedCode = null;
  lastScannedAt = 0;
  console.log('[foodme:scanner] scanner stopped');
}

async function toggleTorch() {
  if (!activeStream) return false;

  try {
    const track = activeStream.getVideoTracks()[0];
    if (!track) return false;

    const cap = track.getCapabilities ? track.getCapabilities() : {};
    if (!cap.torch) return false;

    torchEnabled = !torchEnabled;
    await track.applyConstraints({ advanced: [{ torch: torchEnabled }] });
    return torchEnabled;
  } catch (e) {
    console.warn('[foodme:scanner] torch toggle failed:', e.message);
    return false;
  }
}

function isTorchSupported() {
  if (!activeStream) return false;
  try {
    const track = activeStream.getVideoTracks()[0];
    if (!track) return false;
    const cap = track.getCapabilities ? track.getCapabilities() : {};
    return !!cap.torch;
  } catch (e) {
    return false;
  }
}
