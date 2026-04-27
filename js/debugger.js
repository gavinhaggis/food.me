'use strict';

// ── food.me in-app debugger ────────────────────────────────────────────────
// Loaded first so it intercepts everything from startup.
// Activated via Settings → debug mode, or ?debug in the URL.
// On Android: no USB cable needed. Copy log → paste in GitHub issue.

const FoodMeDebugger = (() => {

  // ── Log store ──────────────────────────────────────────────────────────────
  const MAX_ENTRIES = 500;
  const entries = [];

  const LEVELS = { log: 0, info: 1, warn: 2, error: 3, event: 4 };
  const LEVEL_LABEL  = ['LOG', 'INFO', 'WARN', 'ERR', 'EVT'];
  const LEVEL_COLOUR = ['#888', '#4A7C59', '#C97B2A', '#B84C4C', '#5B8FD4'];

  function ts() {
    return (performance.now() / 1000).toFixed(3) + 's';
  }

  function push(level, parts) {
    const text = parts.map(p => {
      if (p === null) return 'null';
      if (p === undefined) return 'undefined';
      if (p instanceof Error) return `${p.name}: ${p.message}`;
      if (typeof p === 'object') {
        try { return JSON.stringify(p, null, 0); } catch (_) { return String(p); }
      }
      return String(p);
    }).join(' ');

    const entry = { level, text, ts: ts(), wall: Date.now() };
    entries.push(entry);
    if (entries.length > MAX_ENTRIES) entries.shift();
    renderEntry(entry);
  }

  // ── Console intercept ──────────────────────────────────────────────────────
  const _con = {
    log:   console.log.bind(console),
    info:  console.info.bind(console),
    warn:  console.warn.bind(console),
    error: console.error.bind(console),
  };

  function intercept() {
    ['log', 'info', 'warn', 'error'].forEach(method => {
      console[method] = (...args) => {
        _con[method](...args);
        push(LEVELS[method], args);
      };
    });
  }

  // ── Unhandled errors ───────────────────────────────────────────────────────
  function installGlobalHandlers() {
    window.addEventListener('error', e => {
      push(LEVELS.error, [`[uncaught] ${e.message}`, `@ ${e.filename}:${e.lineno}`]);
    });
    window.addEventListener('unhandledrejection', e => {
      const reason = e.reason instanceof Error
        ? `${e.reason.name}: ${e.reason.message}`
        : String(e.reason);
      push(LEVELS.error, [`[unhandled promise] ${reason}`]);
    });
  }

  // ── Named events (called explicitly from scanner.js etc.) ─────────────────
  function event(name, detail) {
    const text = detail
      ? `${name} — ${typeof detail === 'object' ? JSON.stringify(detail) : detail}`
      : name;
    push(LEVELS.event, [`[event] ${text}`]);
  }

  // ── Panel UI ───────────────────────────────────────────────────────────────
  let panel = null;
  let logEl = null;
  let visible = false;
  let filterLevel = 0; // show all

  function createPanel() {
    if (panel) return;

    panel = document.createElement('div');
    panel.id = 'fm-debug-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Debug log');
    panel.innerHTML = `
      <div id="fm-dbg-toolbar">
        <span id="fm-dbg-title">food.me debugger</span>
        <div id="fm-dbg-filters" role="group" aria-label="Filter log level">
          <button class="fm-lvl-btn fm-lvl-active" data-lvl="0">all</button>
          <button class="fm-lvl-btn" data-lvl="2" style="color:#C97B2A">warn</button>
          <button class="fm-lvl-btn" data-lvl="3" style="color:#B84C4C">err</button>
          <button class="fm-lvl-btn" data-lvl="4" style="color:#5B8FD4">events</button>
        </div>
        <div id="fm-dbg-actions">
          <button id="fm-dbg-camera-btn" title="Camera info">📷</button>
          <button id="fm-dbg-copy-btn" title="Copy log">📋</button>
          <button id="fm-dbg-share-btn" title="Share log" style="display:none">📤</button>
          <button id="fm-dbg-clear-btn" title="Clear">🗑</button>
          <button id="fm-dbg-close-btn" title="Close">✕</button>
        </div>
      </div>
      <div id="fm-dbg-device-banner"></div>
      <div id="fm-dbg-log" aria-live="polite" aria-relevant="additions"></div>
    `;
    document.body.appendChild(panel);
    logEl = panel.querySelector('#fm-dbg-log');

    // Render any entries that arrived before the panel existed
    entries.forEach(renderEntry);

    // Filter buttons
    panel.querySelectorAll('.fm-lvl-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        filterLevel = parseInt(btn.dataset.lvl, 10);
        panel.querySelectorAll('.fm-lvl-btn').forEach(b => b.classList.remove('fm-lvl-active'));
        btn.classList.add('fm-lvl-active');
        rebuildLog();
      });
    });

    // Copy
    panel.querySelector('#fm-dbg-copy-btn').addEventListener('click', () => {
      const text = buildPlainText();
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => showToast('log copied'));
      } else {
        // Fallback for older Android WebView
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        try { document.execCommand('copy'); showToast('log copied'); } catch (_) {}
        document.body.removeChild(ta);
      }
    });

    // Share (Web Share API — works on Android Chrome)
    const shareBtn = panel.querySelector('#fm-dbg-share-btn');
    if (navigator.share) {
      shareBtn.style.display = '';
      shareBtn.addEventListener('click', async () => {
        try {
          await navigator.share({
            title: 'food.me debug log',
            text: buildPlainText()
          });
        } catch (e) {
          if (e.name !== 'AbortError') showToast('share failed: ' + e.message);
        }
      });
    }

    // Camera info
    panel.querySelector('#fm-dbg-camera-btn').addEventListener('click', () => {
      collectCameraInfo().then(info => {
        event('CAMERA_INFO', info);
        rebuildLog();
      });
    });

    // Clear
    panel.querySelector('#fm-dbg-clear-btn').addEventListener('click', () => {
      entries.length = 0;
      logEl.innerHTML = '';
    });

    // Close
    panel.querySelector('#fm-dbg-close-btn').addEventListener('click', hidePanel);

    // Device banner
    populateDeviceBanner();
  }

  function renderEntry(entry) {
    if (!logEl) return;
    if (entry.level < filterLevel) return;

    const row = document.createElement('div');
    row.className = 'fm-log-row';
    row.dataset.level = entry.level;
    if (entry.level < filterLevel) row.style.display = 'none';

    const colour = LEVEL_COLOUR[entry.level] || '#888';
    const label  = LEVEL_LABEL[entry.level]  || '?';

    // Highlight foodme-prefixed messages
    const isFoodMe = entry.text.startsWith('[foodme:');
    const textClass = isFoodMe ? 'fm-log-text fm-log-text--fm' : 'fm-log-text';

    row.innerHTML =
      `<span class="fm-log-ts">${entry.ts}</span>` +
      `<span class="fm-log-lvl" style="color:${colour}">${label}</span>` +
      `<span class="${textClass}">${escapeDebugHtml(entry.text)}</span>`;

    logEl.appendChild(row);
    // Auto-scroll to bottom
    logEl.scrollTop = logEl.scrollHeight;
  }

  function rebuildLog() {
    if (!logEl) return;
    logEl.innerHTML = '';
    entries.forEach(e => {
      if (e.level >= filterLevel) renderEntry(e);
    });
  }

  function populateDeviceBanner() {
    const banner = panel.querySelector('#fm-dbg-device-banner');
    if (!banner) return;
    const ua = navigator.userAgent;
    const isAndroid = /Android/.test(ua);
    const isIOS = /iPhone|iPad/.test(ua);
    const platform = isAndroid ? 'Android' : isIOS ? 'iOS' : 'other';
    const match = ua.match(/Android ([\d.]+)/);
    const androidVer = match ? match[1] : '';
    const chromeMatch = ua.match(/Chrome\/([\d.]+)/);
    const chromeVer = chromeMatch ? chromeMatch[1] : '';
    const secure = location.protocol === 'https:' || location.hostname === 'localhost';

    banner.innerHTML =
      `<span class="fm-banner-chip">${platform}${androidVer ? ' ' + androidVer : ''}</span>` +
      (chromeVer ? `<span class="fm-banner-chip">Chrome ${chromeVer}</span>` : '') +
      `<span class="fm-banner-chip" style="color:${secure ? '#4A7C59' : '#B84C4C'}">${secure ? '🔒 https' : '⚠ http'}</span>` +
      `<span class="fm-banner-chip">${screen.width}×${screen.height}</span>`;
  }

  async function collectCameraInfo() {
    const info = {
      mediaDevices: !!navigator.mediaDevices,
      getUserMedia: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
      enumerateDevices: !!(navigator.mediaDevices && navigator.mediaDevices.enumerateDevices),
      permissionsAPI: !!navigator.permissions,
      cameras: [],
      activeTrack: null,
      error: null
    };

    // Permission state
    try {
      const p = await navigator.permissions.query({ name: 'camera' });
      info.permission = p.state;
    } catch (e) {
      info.permission = 'API_unavailable';
    }

    // Enumerate cameras
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      info.cameras = devices
        .filter(d => d.kind === 'videoinput')
        .map(d => ({ label: d.label || '(no label — permission needed)', id: d.deviceId.slice(0, 8) + '…' }));
    } catch (e) {
      info.error = e.message;
    }

    // Active stream info
    if (typeof activeStream !== 'undefined' && activeStream) {
      const track = activeStream.getVideoTracks()[0];
      if (track) {
        const settings = track.getSettings ? track.getSettings() : {};
        const cap = track.getCapabilities ? track.getCapabilities() : {};
        info.activeTrack = {
          label: track.label,
          readyState: track.readyState,
          facing: settings.facingMode || 'unknown',
          width: settings.width,
          height: settings.height,
          frameRate: settings.frameRate ? Math.round(settings.frameRate) : null,
          torch: cap.torch || false,
          zoom: cap.zoom ? `${cap.zoom.min}–${cap.zoom.max}` : false
        };
      }
    }

    return info;
  }

  function buildPlainText() {
    const lines = [
      '=== food.me debug log ===',
      `exported: ${new Date().toISOString()}`,
      `ua: ${navigator.userAgent}`,
      `url: ${location.href}`,
      `online: ${navigator.onLine}`,
      '',
      '--- log ---',
      ...entries.map(e => `[${e.ts}] ${LEVEL_LABEL[e.level]} ${e.text}`),
      '',
      '=== end ==='
    ];
    return lines.join('\n');
  }

  // Inject styles
  function injectStyles() {
    if (document.getElementById('fm-debug-styles')) return;
    const style = document.createElement('style');
    style.id = 'fm-debug-styles';
    style.textContent = `
      #fm-debug-panel {
        position: fixed;
        inset: 0;
        z-index: 9999;
        background: #0d0d0d;
        color: #d0d0d0;
        font-family: 'Menlo', 'Consolas', 'Courier New', monospace;
        font-size: 11px;
        display: flex;
        flex-direction: column;
        overscroll-behavior: contain;
      }
      #fm-dbg-toolbar {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 12px;
        background: #1a1a1a;
        border-bottom: 1px solid #2a2a2a;
        flex-shrink: 0;
        flex-wrap: wrap;
      }
      #fm-dbg-title {
        font-size: 12px;
        font-weight: 700;
        color: #4A7C59;
        letter-spacing: 0.04em;
        flex-shrink: 0;
      }
      #fm-dbg-filters {
        display: flex;
        gap: 4px;
        flex: 1;
      }
      .fm-lvl-btn {
        background: #222;
        border: 1px solid #333;
        color: #888;
        padding: 3px 8px;
        border-radius: 4px;
        font-size: 10px;
        font-family: inherit;
        cursor: pointer;
        min-height: 28px;
        min-width: 36px;
      }
      .fm-lvl-active {
        background: #2a2a2a;
        border-color: #4A7C59;
        color: #fff;
      }
      #fm-dbg-actions {
        display: flex;
        gap: 4px;
        flex-shrink: 0;
      }
      #fm-dbg-actions button {
        background: #222;
        border: 1px solid #333;
        padding: 4px 8px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
        min-height: 32px;
        min-width: 36px;
      }
      #fm-dbg-device-banner {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        padding: 6px 12px;
        background: #111;
        border-bottom: 1px solid #1e1e1e;
        flex-shrink: 0;
      }
      .fm-banner-chip {
        font-size: 10px;
        background: #1e1e1e;
        border: 1px solid #2a2a2a;
        padding: 2px 6px;
        border-radius: 4px;
        color: #aaa;
      }
      #fm-dbg-log {
        flex: 1;
        overflow-y: auto;
        -webkit-overflow-scrolling: touch;
        padding: 4px 0;
      }
      .fm-log-row {
        display: grid;
        grid-template-columns: 52px 36px 1fr;
        gap: 4px;
        padding: 3px 10px;
        border-bottom: 1px solid #111;
        line-height: 1.5;
        word-break: break-all;
      }
      .fm-log-row:nth-child(odd) { background: #0a0a0a; }
      .fm-log-ts  { color: #444; font-size: 10px; padding-top: 1px; }
      .fm-log-lvl { font-weight: 700; font-size: 10px; padding-top: 1px; }
      .fm-log-text { font-size: 11px; }
      .fm-log-text--fm { color: #7fbf9b; }

      /* Floating trigger button */
      #fm-debug-trigger {
        position: fixed;
        bottom: 80px;
        right: 12px;
        z-index: 9998;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background: rgba(26,26,26,0.85);
        border: 1px solid #333;
        color: #4A7C59;
        font-size: 18px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        backdrop-filter: blur(4px);
        box-shadow: 0 2px 8px rgba(0,0,0,0.4);
      }

      #fm-debug-toast {
        position: fixed;
        bottom: 130px;
        left: 50%;
        transform: translateX(-50%) translateY(10px);
        background: #222;
        color: #7fbf9b;
        font-family: 'Menlo', monospace;
        font-size: 12px;
        padding: 6px 14px;
        border-radius: 999px;
        border: 1px solid #333;
        opacity: 0;
        transition: opacity 0.2s, transform 0.2s;
        pointer-events: none;
        z-index: 10000;
        white-space: nowrap;
      }
      #fm-debug-toast.fm-toast-show {
        opacity: 1;
        transform: translateX(-50%) translateY(0);
      }
    `;
    document.head.appendChild(style);
  }

  // Floating trigger button
  function createTrigger() {
    if (document.getElementById('fm-debug-trigger')) return;
    const btn = document.createElement('button');
    btn.id = 'fm-debug-trigger';
    btn.setAttribute('aria-label', 'Open debug log');
    btn.textContent = '⌥';
    btn.addEventListener('click', togglePanel);
    document.body.appendChild(btn);
  }

  function showPanel() {
    injectStyles();
    createPanel();
    if (panel) panel.style.display = 'flex';
    visible = true;
  }

  function hidePanel() {
    if (panel) panel.style.display = 'none';
    visible = false;
  }

  function togglePanel() {
    visible ? hidePanel() : showPanel();
  }

  let toastTimer;
  function showToast(msg) {
    let el = document.getElementById('fm-debug-toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'fm-debug-toast';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add('fm-toast-show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('fm-toast-show'), 2000);
  }

  function escapeDebugHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  function enable() {
    intercept();
    installGlobalHandlers();
    injectStyles();
    createTrigger();
    event('DEBUGGER_INIT', {
      ua: navigator.userAgent,
      url: location.href,
      online: navigator.onLine,
      protocol: location.protocol,
      ts: new Date().toISOString()
    });
  }

  function disable() {
    // Restore original console methods
    Object.assign(console, _con);
    const trigger = document.getElementById('fm-debug-trigger');
    if (trigger) trigger.remove();
    if (panel) { panel.remove(); panel = null; logEl = null; }
  }

  return { enable, disable, event, showPanel, hidePanel, togglePanel, getEntries: () => [...entries] };

})();

// ── Scanner event hooks ────────────────────────────────────────────────────
// Instrument scanner.js milestones so they appear in the log as EVT entries.
// These run after scanner.js is loaded (both files are in the same global scope).

window._scannerInstrument = function () {
  const _startScanner = startScanner;
  window.startScanner = async function (videoElementId, onSuccess, onError) {
    FoodMeDebugger.event('SCANNER_START', { videoElementId });

    const wrappedSuccess = (code) => {
      FoodMeDebugger.event('SCAN_SUCCESS', { code });
      onSuccess(code);
    };
    const wrappedError = (type) => {
      FoodMeDebugger.event('SCAN_ERROR', { type });
      onError(type);
    };

    return _startScanner(videoElementId, wrappedSuccess, wrappedError);
  };

  const _stopScanner = stopScanner;
  window.stopScanner = function () {
    FoodMeDebugger.event('SCANNER_STOP');
    return _stopScanner();
  };
};

// ── Auto-enable ────────────────────────────────────────────────────────────
// Enable immediately if ?debug is in the URL (useful for direct device testing).
// Also enabled when APP_STATE.debugMode is toggled (wired in app.js).
if (location.search.includes('debug')) {
  FoodMeDebugger.enable();
}
