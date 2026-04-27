'use strict';

// ── Global application state ───────────────────────────────────────────────
window.APP_STATE = {
  profile: null,
  debugMode: location.search.includes('debug'), // pre-enable via ?debug
  lastBarcode: null,
  lastApiResult: null,
  lastVerdictResult: null,
  currentProductId: null,
  currentScanCount: 1
};

// ── Initialise ────────────────────────────────────────────────────────────

async function init() {
  // Register service worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(err => {
      console.warn('[foodme] service worker registration failed', err);
    });
  }

  // Wire bottom navigation
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      const screen = item.dataset.screen;
      if (!screen) return;

      // Stop scanner when leaving scan screen
      if (currentScreen === 'screen-scan' && screen !== 'screen-scan') {
        stopScanner();
      }

      switch (screen) {
        case 'screen-scan':
          showScreen('screen-scan');
          startScanScreen();
          break;
        case 'screen-history':
          renderHistoryScreen();
          break;
        case 'screen-safe':
          renderSafeFoodsScreen();
          break;
        case 'screen-settings':
          renderSettingsScreen();
          break;
      }
    });
  });

  // Close modal on overlay click
  const modalOverlay = document.getElementById('modal-overlay');
  if (modalOverlay) {
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) {
        modalOverlay.style.display = 'none';
        modalOverlay.innerHTML = '';
      }
    });
  }

  // Load profile
  try {
    const profile = await getProfile();
    window.APP_STATE.profile = profile;

    if (!profile) {
      // First launch — show onboarding
      renderOnboarding();
    } else {
      // Returning user — go to scan screen
      showScreen('screen-scan');
      startScanScreen();
    }
  } catch (e) {
    console.error('[foodme] init failed', e);
    // Fallback: show scan screen anyway
    showScreen('screen-scan');
    startScanScreen();
  }
}

document.addEventListener('DOMContentLoaded', init);
