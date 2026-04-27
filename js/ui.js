'use strict';

// ── Date helpers ──────────────────────────────────────────────────────────

function humanDate(timestamp) {
  if (!timestamp) return 'unknown date';
  const now = Date.now();
  const diff = now - timestamp;
  const day = 86400000;

  if (diff < day) return 'today';
  if (diff < 2 * day) return 'yesterday';
  if (diff < 7 * day) return `${Math.floor(diff / day)} days ago`;
  if (diff < 30 * day) return `${Math.floor(diff / (7 * day))} weeks ago`;
  return new Date(timestamp).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ── Verdict UI helpers ────────────────────────────────────────────────────

const VERDICT_CONFIG = {
  safe: {
    emoji: '🟢',
    label: 'this looks good for you',
    cssClass: 'verdict--safe',
    color: 'var(--color-safe)'
  },
  caution: {
    emoji: '🟡',
    label: 'a few things to check',
    cssClass: 'verdict--caution',
    color: 'var(--color-caution)'
  },
  warning: {
    emoji: '🔴',
    label: "this one's not for you",
    cssClass: 'verdict--warning',
    color: 'var(--color-warning)'
  }
};

// ── Screen management ─────────────────────────────────────────────────────

let currentScreen = null;

function showScreen(screenId) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('screen--active'));
  const target = document.getElementById(screenId);
  if (target) {
    target.classList.add('screen--active');
    currentScreen = screenId;
  }

  // Show/hide app header (hide on scan screen for max viewport)
  const header = document.getElementById('app-header');
  if (header) {
    header.style.display = screenId === 'screen-scan' || screenId === 'screen-onboarding' ? 'none' : 'flex';
  }

  // Update bottom nav
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.toggle('nav-item--active', item.dataset.screen === screenId);
  });

  // Hide nav on onboarding
  const nav = document.querySelector('.bottom-nav');
  if (nav) {
    nav.style.display = screenId === 'screen-onboarding' ? 'none' : 'flex';
  }

  // Adjust app padding for nav visibility
  const app = document.getElementById('app');
  if (app) {
    app.style.paddingBottom = screenId === 'screen-onboarding' ? '0' : '';
  }

  // Update debug bar
  updateDebugBar();
}

// ── Onboarding ────────────────────────────────────────────────────────────

let onboardingState = {
  step: 1,
  selectedAllergens: [],
  confidenceLevels: {},
  customSensitivities: [],
  dismissedGroups: []
};

function renderOnboarding() {
  showScreen('screen-onboarding');
  renderOnboardingStep(onboardingState.step);
}

function renderOnboardingStep(step) {
  const container = document.getElementById('onboarding-content');
  container.innerHTML = '';

  switch (step) {
    case 1: renderOnboardingWelcome(container); break;
    case 2: renderOnboardingAllergens(container); break;
    case 3: renderOnboardingConfidence(container); break;
    case 4: renderOnboardingCustom(container); break;
    case 5: renderOnboardingGroups(container); break;
    case 6: renderOnboardingReady(container); break;
  }
}

function renderOnboardingWelcome(container) {
  container.innerHTML = `
    <div class="onboarding-welcome">
      <div class="wordmark">food.me</div>
      <p class="tagline">know what's in your food.<br>trust what you eat.</p>
      <button class="btn btn--primary btn--large" id="ob-start">let's get started</button>
    </div>
  `;
  document.getElementById('ob-start').addEventListener('click', () => {
    onboardingState.step = 2;
    renderOnboardingStep(2);
  });
}

function renderOnboardingAllergens(container) {
  const eu14Keys = Object.entries(SENSITIVITY_DICTIONARY)
    .filter(([, v]) => v.tier === 'eu14')
    .map(([k, v]) => ({ key: k, ...v }));

  container.innerHTML = `
    <div class="onboarding-section">
      <div class="onboarding-progress">step 1 of 5</div>
      <h2 class="onboarding-heading">what affects you?</h2>
      <p class="onboarding-sub">tap everything that doesn't agree with you</p>
      <div class="allergen-grid" id="allergen-grid"></div>
      <button class="btn btn--ghost btn--block mt-4" id="ob-none">none of these</button>
      <button class="btn btn--primary btn--block mt-2" id="ob-next-2">next</button>
    </div>
  `;

  const grid = document.getElementById('allergen-grid');
  for (const item of eu14Keys) {
    const card = document.createElement('button');
    card.className = 'allergen-card';
    card.dataset.key = item.key;
    card.setAttribute('aria-label', item.displayName);
    card.setAttribute('aria-pressed', 'false');
    card.innerHTML = `<span class="allergen-card__emoji" aria-hidden="true">${item.emoji}</span><span class="allergen-card__name">${item.displayName}</span>`;

    const isSelected = onboardingState.selectedAllergens.includes(item.key);
    if (isSelected) {
      card.classList.add('allergen-card--selected');
      card.setAttribute('aria-pressed', 'true');
    }

    card.addEventListener('click', () => {
      const idx = onboardingState.selectedAllergens.indexOf(item.key);
      if (idx > -1) {
        onboardingState.selectedAllergens.splice(idx, 1);
        card.classList.remove('allergen-card--selected');
        card.setAttribute('aria-pressed', 'false');
      } else {
        onboardingState.selectedAllergens.push(item.key);
        card.classList.add('allergen-card--selected');
        card.setAttribute('aria-pressed', 'true');
      }
    });

    grid.appendChild(card);
  }

  document.getElementById('ob-none').addEventListener('click', () => {
    onboardingState.selectedAllergens = [];
    onboardingState.step = 4;
    renderOnboardingStep(4);
  });

  document.getElementById('ob-next-2').addEventListener('click', () => {
    if (onboardingState.selectedAllergens.length === 0) {
      onboardingState.step = 4;
    } else {
      onboardingState.step = 3;
      onboardingState._confidenceIndex = 0;
    }
    renderOnboardingStep(onboardingState.step);
  });
}

function renderOnboardingConfidence(container) {
  const selected = onboardingState.selectedAllergens;
  const idx = onboardingState._confidenceIndex || 0;

  if (idx >= selected.length) {
    onboardingState.step = 4;
    renderOnboardingStep(4);
    return;
  }

  const key = selected[idx];
  const entry = SENSITIVITY_DICTIONARY[key];
  const total = selected.length;
  const current = idx + 1;

  const currentConfidence = onboardingState.confidenceLevels[key] || 'definite';

  container.innerHTML = `
    <div class="onboarding-section">
      <div class="onboarding-progress">step 2 of 5 — ${current} of ${total}</div>
      <div class="confidence-emoji">${entry.emoji}</div>
      <h2 class="onboarding-heading">how much does<br><em>${entry.displayName}</em> affect you?</h2>
      <div class="confidence-options" role="radiogroup" aria-label="Confidence level">
        <button class="confidence-pill ${currentConfidence === 'definite' ? 'confidence-pill--selected' : ''}" data-value="definite" role="radio" aria-checked="${currentConfidence === 'definite'}">always</button>
        <button class="confidence-pill ${currentConfidence === 'likely' ? 'confidence-pill--selected' : ''}" data-value="likely" role="radio" aria-checked="${currentConfidence === 'likely'}">usually</button>
        <button class="confidence-pill ${currentConfidence === 'suspected' ? 'confidence-pill--selected' : ''}" data-value="suspected" role="radio" aria-checked="${currentConfidence === 'suspected'}">sometimes</button>
      </div>
      <div class="confidence-hint">
        <span data-hint="definite">you always react to this</span>
        <span data-hint="likely" style="display:none">you usually react to this</span>
        <span data-hint="suspected" style="display:none">you sometimes react to this</span>
      </div>
      <button class="btn btn--primary btn--block mt-5" id="ob-confidence-next">
        ${idx + 1 < total ? 'next' : 'continue'}
      </button>
    </div>
  `;

  let selected_confidence = currentConfidence;

  container.querySelectorAll('.confidence-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      selected_confidence = pill.dataset.value;
      container.querySelectorAll('.confidence-pill').forEach(p => {
        p.classList.toggle('confidence-pill--selected', p.dataset.value === selected_confidence);
        p.setAttribute('aria-checked', p.dataset.value === selected_confidence);
      });
      container.querySelectorAll('[data-hint]').forEach(hint => {
        hint.style.display = hint.dataset.hint === selected_confidence ? '' : 'none';
      });
    });
  });

  document.getElementById('ob-confidence-next').addEventListener('click', () => {
    onboardingState.confidenceLevels[key] = selected_confidence;
    onboardingState._confidenceIndex = idx + 1;
    renderOnboardingConfidence(container);
  });
}

function renderOnboardingCustom(container) {
  container.innerHTML = `
    <div class="onboarding-section">
      <div class="onboarding-progress">step 3 of 5</div>
      <h2 class="onboarding-heading">anything else?</h2>
      <p class="onboarding-sub">in plain language — apples, onions, anything at all</p>
      <div class="search-input-wrap">
        <input type="text" id="ob-custom-input" class="text-input" placeholder="type a food..." autocomplete="off" autocorrect="off" spellcheck="false" aria-label="Search for a food sensitivity">
        <div class="suggestion-chips" id="ob-suggestions" role="listbox" aria-label="Suggestions"></div>
      </div>
      <div class="custom-sensitivity-list" id="ob-custom-list"></div>
      <button class="btn btn--primary btn--block mt-5" id="ob-next-4">continue</button>
    </div>
  `;

  renderCustomList();

  const input = document.getElementById('ob-custom-input');
  input.addEventListener('input', () => {
    const query = input.value.trim();
    renderSuggestions(query, 'ob-suggestions', onCustomSelect);
  });

  document.getElementById('ob-next-4').addEventListener('click', () => {
    // Check group suggestions
    const allKeys = [
      ...onboardingState.selectedAllergens,
      ...onboardingState.customSensitivities.map(s => s.key)
    ];
    const groupSuggestions = checkForGroupSuggestions(allKeys, onboardingState.dismissedGroups);

    if (groupSuggestions.length > 0) {
      onboardingState._groupSuggestions = groupSuggestions;
      onboardingState.step = 5;
    } else {
      onboardingState.step = 6;
    }
    renderOnboardingStep(onboardingState.step);
  });
}

function renderCustomList() {
  const list = document.getElementById('ob-custom-list');
  if (!list) return;
  list.innerHTML = '';

  for (const s of onboardingState.customSensitivities) {
    const chip = document.createElement('div');
    chip.className = 'sensitivity-chip';
    chip.innerHTML = `
      <span class="sensitivity-chip__emoji">${s.emoji}</span>
      <span class="sensitivity-chip__name">${s.displayName}</span>
      <button class="sensitivity-chip__remove" aria-label="Remove ${s.displayName}">×</button>
    `;
    chip.querySelector('.sensitivity-chip__remove').addEventListener('click', () => {
      onboardingState.customSensitivities = onboardingState.customSensitivities.filter(x => x.key !== s.key);
      renderCustomList();
    });
    list.appendChild(chip);
  }
}

function renderSuggestions(query, containerId, onSelect) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';
  if (!query || query.length < 2) return;

  const matches = fuzzyMatchSensitivities(query);

  for (const match of matches) {
    const already = onboardingState.customSensitivities.some(s => s.key === match.key) ||
      onboardingState.selectedAllergens.includes(match.key);
    if (already) continue;

    const chip = document.createElement('button');
    chip.className = 'suggestion-chip';
    chip.setAttribute('role', 'option');
    chip.setAttribute('aria-label', match.displayName);
    chip.innerHTML = `${match.emoji} ${match.displayName}`;
    chip.addEventListener('click', () => onSelect(match, container));
    container.appendChild(chip);
  }
}

function onCustomSelect(match, container) {
  const alreadyCustom = onboardingState.customSensitivities.some(s => s.key === match.key);
  const alreadyEU = onboardingState.selectedAllergens.includes(match.key);
  if (alreadyCustom || alreadyEU) return;

  onboardingState.customSensitivities.push({
    key: match.key,
    displayName: match.displayName,
    emoji: match.emoji,
    tier: match.tier,
    confidence: 'suspected',
    keywords: match.keywords || [],
    customKeywords: []
  });

  container.innerHTML = '';
  const input = document.getElementById('ob-custom-input');
  if (input) input.value = '';

  renderCustomList();

  // Show keyword expansion confirmation
  const preview = match.keywords.slice(0, 5).join(', ');
  const confirmEl = document.createElement('div');
  confirmEl.className = 'keyword-confirm';
  confirmEl.innerHTML = `
    <p class="keyword-confirm__text">we'll also watch out for: <em>${preview}</em></p>
  `;
  const list = document.getElementById('ob-custom-list');
  if (list) list.insertAdjacentElement('beforebegin', confirmEl);
  setTimeout(() => confirmEl.remove(), 3000);
}

function renderOnboardingGroups(container) {
  const suggestions = onboardingState._groupSuggestions || [];

  if (suggestions.length === 0) {
    onboardingState.step = 6;
    renderOnboardingStep(6);
    return;
  }

  container.innerHTML = `
    <div class="onboarding-section">
      <div class="onboarding-progress">step 4 of 5</div>
      <h2 class="onboarding-heading">we noticed a pattern</h2>
      <p class="onboarding-sub">based on your selections, these food groups might be relevant</p>
      <div id="ob-group-cards"></div>
      <button class="btn btn--primary btn--block mt-5" id="ob-next-5">looks good</button>
    </div>
  `;

  const cardsContainer = document.getElementById('ob-group-cards');

  for (const { groupKey, group, matchedKeys } of suggestions) {
    const card = document.createElement('div');
    card.className = 'group-suggestion-card';
    card.innerHTML = `
      <div class="group-suggestion-card__header">
        <span class="group-suggestion-card__emoji" aria-hidden="true">${group.emoji}</span>
        <div>
          <div class="group-suggestion-card__title">${group.displayName}</div>
          <div class="group-suggestion-card__matched">matched: ${matchedKeys.join(', ')}</div>
        </div>
        <button class="group-suggestion-card__dismiss" aria-label="Dismiss ${group.displayName}">×</button>
      </div>
      <p class="group-suggestion-card__desc">${group.description}</p>
      <button class="btn btn--outline btn--small group-suggestion-card__add" data-group="${groupKey}">add ${group.displayName} group</button>
    `;

    card.querySelector('.group-suggestion-card__dismiss').addEventListener('click', () => {
      onboardingState.dismissedGroups.push(groupKey);
      card.remove();
    });

    card.querySelector('.group-suggestion-card__add').addEventListener('click', () => {
      // Add all group members not already in profile
      for (const memberKey of group.memberKeys) {
        const alreadyIn = onboardingState.selectedAllergens.includes(memberKey) ||
          onboardingState.customSensitivities.some(s => s.key === memberKey);
        if (!alreadyIn) {
          const entry = SENSITIVITY_DICTIONARY[memberKey];
          if (entry) {
            onboardingState.customSensitivities.push({
              key: memberKey,
              displayName: entry.displayName,
              emoji: entry.emoji,
              tier: entry.tier,
              confidence: 'suspected',
              keywords: entry.keywords || [],
              customKeywords: []
            });
          }
        }
      }
      card.querySelector('.group-suggestion-card__add').textContent = '✓ added';
      card.querySelector('.group-suggestion-card__add').disabled = true;
    });

    cardsContainer.appendChild(card);
  }

  document.getElementById('ob-next-5').addEventListener('click', () => {
    onboardingState.step = 6;
    renderOnboardingStep(6);
  });
}

function renderOnboardingReady(container) {
  const allSensitivities = buildProfileAllergens();

  container.innerHTML = `
    <div class="onboarding-section onboarding-section--ready">
      <div class="ready-check">✓</div>
      <h2 class="onboarding-heading">you're all set</h2>
      <p class="onboarding-sub">here's what we'll keep an eye on for you</p>
      <div class="sensitivity-summary" id="ob-summary"></div>
      <button class="btn btn--primary btn--large mt-6" id="ob-done">start scanning</button>
    </div>
  `;

  const summary = document.getElementById('ob-summary');
  for (const s of allSensitivities) {
    const chip = document.createElement('span');
    chip.className = 'summary-chip';
    chip.innerHTML = `${s.emoji || ''} ${s.displayName}`;
    summary.appendChild(chip);
  }

  if (allSensitivities.length === 0) {
    summary.innerHTML = '<p class="text-secondary">no sensitivities added — you can always update this in settings</p>';
  }

  document.getElementById('ob-done').addEventListener('click', async () => {
    const allergens = buildProfileAllergens();
    const saved = await saveProfile({ allergens });
    if (saved) {
      window.APP_STATE.profile = await getProfile();
      showScreen('screen-scan');
      startScanScreen();
    }
  });
}

function buildProfileAllergens() {
  const allergens = [];

  for (const key of onboardingState.selectedAllergens) {
    const entry = SENSITIVITY_DICTIONARY[key];
    if (!entry) continue;
    allergens.push({
      key,
      displayName: entry.displayName,
      emoji: entry.emoji,
      confidence: onboardingState.confidenceLevels[key] || 'definite',
      tier: entry.tier,
      keywords: entry.keywords || [],
      customKeywords: []
    });
  }

  for (const custom of onboardingState.customSensitivities) {
    if (!allergens.find(a => a.key === custom.key)) {
      allergens.push({
        key: custom.key,
        displayName: custom.displayName,
        emoji: custom.emoji || '',
        confidence: custom.confidence || 'suspected',
        tier: custom.tier || 'custom',
        keywords: custom.keywords || [],
        customKeywords: custom.customKeywords || []
      });
    }
  }

  return allergens;
}

// ── Scan screen ───────────────────────────────────────────────────────────

function startScanScreen() {
  // Replace interactive elements with fresh clones to prevent stacking
  // event listeners across multiple scan-screen entries.
  function replaceWithClone(id) {
    const el = document.getElementById(id);
    if (!el) return null;
    const clone = el.cloneNode(true);
    el.parentNode.replaceChild(clone, el);
    return clone;
  }

  const manualInput  = replaceWithClone('manual-barcode-input');
  const manualSubmit = replaceWithClone('manual-barcode-submit');
  const torchBtn     = replaceWithClone('torch-btn');
  const debugInjectBtn   = replaceWithClone('debug-inject-btn');

  // Start scanner
  startScanner(
    'scanner-video',
    (barcode) => handleBarcodeScanned(barcode),
    (errorType) => handleScannerError(errorType)
  );

  // Torch button — scanner.js calls _updateTorchButton() internally once the
  // stream is live, which sets display:flex on the button if torch is supported.
  // We only need to wire the click handler here.
  if (torchBtn) {
    torchBtn.addEventListener('click', async () => {
      const state = await toggleTorch();
      // Re-query after the clone replaced the element
      const btn = document.getElementById('torch-btn');
      if (btn) {
        btn.setAttribute('aria-pressed', String(state));
        btn.classList.toggle('torch-btn--active', state);
      }
    });
  }

  if (manualInput && manualSubmit) {
    const submitManual = () => {
      const val = manualInput.value.trim();
      if (val) {
        handleBarcodeScanned(val);
        manualInput.value = '';
      }
    };
    manualSubmit.addEventListener('click', submitManual);
    manualInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') submitManual();
    });
  }

  // Debug inject
  const debugInjectInput = document.getElementById('debug-inject-barcode');
  if (debugInjectBtn) {
    debugInjectBtn.addEventListener('click', () => {
      const val = debugInjectInput ? debugInjectInput.value.trim() : '';
      if (val) handleBarcodeScanned(val);
    });
  }
}

async function handleBarcodeScanned(barcode) {
  window.APP_STATE.lastBarcode = barcode;
  updateDebugBar();

  stopScanner();
  showLoadingOverlay('looking that up…');

  try {
    const apiResult = await fetchFromOpenFoodFacts(barcode);
    window.APP_STATE.lastApiResult = apiResult;
    updateDebugBar();
    hideLoadingOverlay();
    await showResultScreen(barcode, apiResult);
  } catch (e) {
    hideLoadingOverlay();
    showErrorState('something went wrong while looking that up. try again?', () => {
      showScreen('screen-scan');
      startScanScreen();
    });
  }
}

function handleScannerError(errorType) {
  // Collapse the camera viewfinder and show a calm fallback
  const scannerWrap = document.querySelector('.scanner-wrap');
  if (scannerWrap) {
    scannerWrap.style.flex = '0';
    scannerWrap.style.minHeight = '0';
    scannerWrap.style.height = '0';
    scannerWrap.style.overflow = 'hidden';
  }

  const videoEl = document.getElementById('scanner-video');
  if (videoEl) videoEl.style.display = 'none';

  const torchBtn = document.getElementById('torch-btn');
  if (torchBtn) torchBtn.style.display = 'none';

  // Replace manual entry section with a clear, actionable fallback
  const manualSection = document.querySelector('.manual-entry-section');
  if (manualSection) {
    const MESSAGES = {
      insecure_context: {
        icon: '🔒',
        heading: 'camera needs a secure connection',
        sub: 'your browser blocks camera access on plain http. to use the scanner, open this app over https — or on localhost for testing. you can still look up products by typing a barcode below.',
        hint: `current url: ${location.href}`
      },
      permission_denied: {
        icon: '📷',
        heading: 'camera access was denied',
        sub: "to re-enable the camera, tap the lock icon in your browser's address bar and allow camera access, then reload the page.",
        hint: null
      },
      no_camera: {
        icon: '📷',
        heading: 'no camera found',
        sub: "this device doesn't appear to have a camera available. type a barcode below to look up a product.",
        hint: null
      },
      unknown: {
        icon: '⌨️',
        heading: 'camera unavailable',
        sub: 'something went wrong starting the camera. type or paste a barcode below.',
        hint: null
      }
    };

    const msg = MESSAGES[errorType] || MESSAGES.unknown;

    manualSection.innerHTML = `
      <div class="camera-denied-state">
        <span class="camera-denied-state__icon" aria-hidden="true">${msg.icon}</span>
        <h2 class="camera-denied-state__heading">${msg.heading}</h2>
        <p class="camera-denied-state__sub">${escapeHtml(msg.sub)}</p>
        ${msg.hint ? `<p class="camera-denied-state__hint">${escapeHtml(msg.hint)}</p>` : ''}
      </div>
      <div class="manual-entry-row">
        <input type="text" id="manual-barcode-input" class="text-input text-input--barcode"
          placeholder="barcode number"
          inputmode="tel"
          pattern="[0-9]*"
          autocomplete="off"
          aria-label="Manual barcode entry"
          autofocus>
        <button id="manual-barcode-submit" class="btn btn--primary btn--compact" aria-label="Look up barcode">go</button>
      </div>
    `;

    // Re-wire the manual entry handler
    const input = manualSection.querySelector('#manual-barcode-input');
    const submit = manualSection.querySelector('#manual-barcode-submit');
    const doSubmit = () => {
      const val = input.value.trim();
      if (val) {
        handleBarcodeScanned(val);
        input.value = '';
      }
    };
    if (submit) submit.addEventListener('click', doSubmit);
    if (input) input.addEventListener('keydown', e => { if (e.key === 'Enter') doSubmit(); });
  }
}

// ── Result screen ─────────────────────────────────────────────────────────

async function showResultScreen(barcode, apiResult) {
  showScreen('screen-result');

  const profile = window.APP_STATE.profile;
  const container = document.getElementById('result-content');
  container.innerHTML = '';

  if (!apiResult.found) {
    renderProductNotFound(container, barcode);
    return;
  }

  // Save product to DB
  const productData = {
    barcode,
    name: apiResult.name,
    brand: apiResult.brand,
    source: 'openfoodfacts',
    ingredients: apiResult.ingredients,
    rawIngredientsText: apiResult.rawIngredientsText,
    allergenTags: apiResult.allergenTags,
    markedSafe: false,
    userOverride: false,
    overrideNote: ''
  };

  const productId = await saveProduct(productData);
  window.APP_STATE.currentProductId = productId;

  // Calculate verdict
  const verdictResult = await calculateVerdict(
    { ...productData, id: productId },
    profile
  );
  window.APP_STATE.lastVerdictResult = verdictResult;
  updateDebugBar();

  // Save scan history
  if (productId) {
    await saveScanHistory({
      barcode,
      productId,
      verdict: verdictResult.verdict,
      confidenceScore: verdictResult.confidenceScore || 0,
      knownIngredientPercent: verdictResult.knownPercent,
      flaggedSensitivities: verdictResult.flagged.map(f => f.sensitivity.displayName)
    });
  }

  renderResultContent(container, apiResult, verdictResult, productId);
}

function renderResultContent(container, apiResult, verdictResult, productId) {
  const vc = VERDICT_CONFIG[verdictResult.verdict];

  const imageHtml = apiResult.imageUrl
    ? `<div class="result-image-wrap"><img src="${escapeHtml(apiResult.imageUrl)}" alt="${escapeHtml(apiResult.name)}" class="result-image" loading="lazy"></div>`
    : '';

  const flaggedHtml = verdictResult.flagged.length > 0
    ? `<div class="flagged-list">
        <h3 class="section-label">flagged sensitivities</h3>
        ${verdictResult.flagged.map(f => `
          <div class="flagged-item">
            <span class="flagged-item__name">${escapeHtml(f.sensitivity.emoji || '')} ${escapeHtml(f.sensitivity.displayName)}</span>
            <span class="flagged-item__type">${f.matchType === 'structured' ? 'listed allergen' : 'found in ingredients'}</span>
            <span class="flagged-item__confidence confidence--${f.sensitivity.confidence}">${f.sensitivity.confidence}</span>
          </div>
        `).join('')}
      </div>`
    : '';

  const provenanceHtml = renderProvenanceSection(verdictResult);

  const scanCount = window.APP_STATE.currentScanCount || 1;
  const scanCountHtml = scanCount > 1
    ? `<p class="scan-count-note">you've scanned this ${scanCount} time${scanCount !== 1 ? 's' : ''}</p>`
    : '';

  container.innerHTML = `
    ${imageHtml}
    <div class="result-product-info">
      <h1 class="result-product-name">${escapeHtml(apiResult.name)}</h1>
      ${apiResult.brand ? `<p class="result-brand">${escapeHtml(apiResult.brand)}</p>` : ''}
      ${scanCountHtml}
    </div>
    <div class="verdict-banner ${vc.cssClass}" role="status" aria-live="polite">
      <span class="verdict-banner__emoji" aria-hidden="true">${vc.emoji}</span>
      <span class="verdict-banner__label">${vc.label}</span>
    </div>
    ${flaggedHtml}
    ${provenanceHtml}
    <div class="result-actions">
      <button class="btn btn--primary btn--block" id="mark-safe-btn">mark as safe</button>
      <button class="btn btn--ghost btn--block mt-2" id="scan-another-btn">scan another</button>
    </div>
    ${renderDebugPanel(apiResult, verdictResult)}
  `;

  document.getElementById('scan-another-btn').addEventListener('click', () => {
    showScreen('screen-scan');
    startScanScreen();
  });

  document.getElementById('mark-safe-btn').addEventListener('click', () => {
    handleMarkSafe(productId, verdictResult);
  });

  // Expandable ingredients
  const toggleBtn = container.querySelector('.provenance-toggle');
  const ingredientsList = container.querySelector('.provenance-ingredients');
  if (toggleBtn && ingredientsList) {
    toggleBtn.addEventListener('click', () => {
      const expanded = ingredientsList.style.display !== 'none';
      ingredientsList.style.display = expanded ? 'none' : 'block';
      toggleBtn.textContent = expanded ? 'show ingredients' : 'hide ingredients';
    });
  }

  // Debug panel toggle
  const debugToggle = container.querySelector('.debug-panel-toggle');
  const debugPanel = container.querySelector('.debug-panel');
  if (debugToggle && debugPanel) {
    debugToggle.addEventListener('click', () => {
      const expanded = debugPanel.style.display !== 'none';
      debugPanel.style.display = expanded ? 'none' : 'block';
      debugToggle.textContent = expanded ? 'show debug' : 'hide debug';
    });
  }
}

function renderProvenanceSection(verdictResult) {
  const { knownPercent, provenanceTrail } = verdictResult;

  const ingredientRows = provenanceTrail.slice(0, 30).map(item => {
    const dotClass = item.status === 'known' ? 'dot--green'
      : item.status === 'flagged' ? 'dot--red' : 'dot--grey';
    const seenText = item.seenIn && item.seenIn.length > 0
      ? `seen in: ${item.seenIn.join(', ')}`
      : item.status === 'flagged' ? 'matches your sensitivities' : 'not seen before';

    return `
      <div class="ingredient-row">
        <span class="ingredient-dot ${dotClass}" aria-hidden="true"></span>
        <span class="ingredient-row__name">${escapeHtml(item.ingredient)}</span>
        <span class="ingredient-row__context">${escapeHtml(seenText)}</span>
      </div>
    `;
  }).join('');

  const circumference = 2 * Math.PI * 28;
  const offset = circumference - (knownPercent / 100) * circumference;

  return `
    <div class="provenance-section">
      <h3 class="section-label">ingredient confidence</h3>
      <div class="provenance-ring-wrap">
        <svg class="provenance-ring" width="72" height="72" viewBox="0 0 72 72" aria-hidden="true">
          <circle cx="36" cy="36" r="28" fill="none" stroke="var(--color-border)" stroke-width="6"/>
          <circle cx="36" cy="36" r="28" fill="none" stroke="var(--color-accent)" stroke-width="6"
            stroke-dasharray="${circumference.toFixed(2)}"
            stroke-dashoffset="${offset.toFixed(2)}"
            stroke-linecap="round"
            transform="rotate(-90 36 36)"/>
        </svg>
        <div class="provenance-ring__label">
          <span class="provenance-ring__percent">${knownPercent}%</span>
          <span class="provenance-ring__sub">recognised</span>
        </div>
      </div>
      ${provenanceTrail.length > 0 ? `
        <button class="btn btn--text provenance-toggle" aria-expanded="false">show ingredients</button>
        <div class="provenance-ingredients" style="display:none">${ingredientRows}</div>
      ` : ''}
    </div>
  `;
}

function renderProductNotFound(container, barcode) {
  container.innerHTML = `
    <div class="not-found-state">
      <div class="not-found-state__icon" aria-hidden="true">🔍</div>
      <h2 class="not-found-state__heading">we don't have data for this product</h2>
      <p class="not-found-state__sub">barcode: ${escapeHtml(barcode)}</p>
      <p class="not-found-state__copy">you can still check it by entering the ingredients yourself</p>
      <div class="not-found-actions">
        <button class="btn btn--primary" id="manual-entry-btn">type ingredients</button>
        <button class="btn btn--outline" id="photo-label-btn">photograph label</button>
      </div>
      <button class="btn btn--ghost btn--block mt-4" id="nf-scan-another">scan another</button>
    </div>
  `;

  document.getElementById('nf-scan-another').addEventListener('click', () => {
    showScreen('screen-scan');
    startScanScreen();
  });

  document.getElementById('manual-entry-btn').addEventListener('click', () => {
    showManualEntryModal(barcode, 'manual');
  });

  document.getElementById('photo-label-btn').addEventListener('click', () => {
    showManualEntryModal(barcode, 'camera-ocr');
  });
}

function showManualEntryModal(barcode, source) {
  const modal = document.getElementById('modal-overlay');
  modal.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true" aria-label="Enter ingredients">
      <h2 class="modal__heading">type the ingredients from the label</h2>
      ${source === 'camera-ocr' ? `
        <div class="camera-hint">
          <label class="btn btn--outline btn--small" for="label-photo-input">
            📷 take a photo
          </label>
          <input type="file" id="label-photo-input" accept="image/*" capture="environment" style="display:none">
          <p class="camera-hint__text">photograph the ingredients list, then copy them into the box below</p>
          <img id="label-photo-preview" class="label-photo-preview" style="display:none" alt="Label photo">
        </div>
      ` : ''}
      <label class="form-label" for="manual-ingredients-textarea">ingredients list</label>
      <textarea id="manual-ingredients-textarea" class="text-area" rows="6" placeholder="Paste or type the ingredients list here" aria-label="Ingredients list"></textarea>
      <label class="form-label" for="manual-product-name">product name (optional)</label>
      <input type="text" id="manual-product-name" class="text-input" placeholder="e.g. Own-brand oat biscuits" aria-label="Product name">
      <div class="modal__actions">
        <button class="btn btn--primary" id="modal-analyse-btn">analyse</button>
        <button class="btn btn--ghost" id="modal-cancel-btn">cancel</button>
      </div>
    </div>
  `;
  modal.style.display = 'flex';

  const photoInput = document.getElementById('label-photo-input');
  const photoPreview = document.getElementById('label-photo-preview');
  if (photoInput && photoPreview) {
    photoInput.addEventListener('change', () => {
      const file = photoInput.files[0];
      if (file) {
        const url = URL.createObjectURL(file);
        photoPreview.src = url;
        photoPreview.style.display = 'block';
      }
    });
  }

  document.getElementById('modal-cancel-btn').addEventListener('click', () => {
    modal.style.display = 'none';
    modal.innerHTML = '';
  });

  document.getElementById('modal-analyse-btn').addEventListener('click', async () => {
    const rawText = document.getElementById('manual-ingredients-textarea').value.trim();
    const productName = document.getElementById('manual-product-name').value.trim() || 'Unknown product';

    if (!rawText) {
      document.getElementById('manual-ingredients-textarea').focus();
      return;
    }

    modal.style.display = 'none';
    modal.innerHTML = '';

    const ingredients = parseIngredients(rawText);
    const fakeApiResult = {
      found: true,
      name: productName,
      brand: '',
      ingredients,
      rawIngredientsText: rawText,
      allergenTags: [],
      imageUrl: '',
      source
    };

    await showResultScreen(barcode, fakeApiResult);
  });
}

async function handleMarkSafe(productId, verdictResult) {
  if (!productId) return;

  if (verdictResult.flagged.length > 0) {
    const flaggedNames = verdictResult.flagged.map(f => f.sensitivity.displayName).join(', ');
    showConfirmModal(
      `heads up — this product is flagged for ${flaggedNames}. our data might be outdated, or your relationship with this food may have changed. you know your body best.`,
      'mark safe anyway',
      'leave it for now',
      async () => {
        await markProductSafe(productId, true, 'user override');
        showToast('marked as safe');
        document.getElementById('mark-safe-btn').textContent = '✓ marked safe';
        document.getElementById('mark-safe-btn').disabled = true;
      }
    );
  } else {
    await markProductSafe(productId, false);
    showToast('marked as safe');
    document.getElementById('mark-safe-btn').textContent = '✓ marked safe';
    document.getElementById('mark-safe-btn').disabled = true;
  }
}

function renderDebugPanel(apiResult, verdictResult) {
  if (!window.APP_STATE.debugMode) return '';

  const { debugSteps } = verdictResult;

  return `
    <div class="debug-section">
      <button class="btn btn--text debug-panel-toggle">show debug</button>
      <div class="debug-panel" style="display:none">
        <h4>Step 1 — structured tag hits</h4>
        <pre class="debug-pre">${JSON.stringify(debugSteps.step1Hits.map(h => ({ key: h.sensitivity.key, tag: h.matchedValue })), null, 2)}</pre>
        <h4>Step 2 — keyword hits</h4>
        <pre class="debug-pre">${JSON.stringify(debugSteps.step2Hits.map(h => ({ key: h.sensitivity.key, keyword: h.matchedKeyword })), null, 2)}</pre>
        <h4>Step 3 — provenance</h4>
        <pre class="debug-pre">known: ${debugSteps.step3.known} / unknown: ${debugSteps.step3.unknown}</pre>
        <h4>Final verdict: ${verdictResult.verdict}</h4>
        <h4>Normalised ingredients</h4>
        <pre class="debug-pre">${JSON.stringify(apiResult.ingredients, null, 2)}</pre>
        <h4>Allergen tags</h4>
        <pre class="debug-pre">${JSON.stringify(apiResult.allergenTags, null, 2)}</pre>
        <h4>Raw API response</h4>
        <pre class="debug-pre" style="max-height:200px;overflow-y:auto">${escapeHtml(JSON.stringify(apiResult.rawResponse || {}, null, 2))}</pre>
      </div>
    </div>
  `;
}

// ── History screen ────────────────────────────────────────────────────────

async function renderHistoryScreen() {
  showScreen('screen-history');
  const container = document.getElementById('history-list');
  container.innerHTML = '<p class="loading-text">loading…</p>';

  const history = await getAllScanHistory();

  if (history.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <p class="empty-state__icon">📋</p>
        <p class="empty-state__text">nothing here yet — scan something to get started</p>
      </div>
    `;
    return;
  }

  let currentFilter = 'all';
  let searchQuery = '';

  function getFiltered() {
    return history.filter(entry => {
      const matchesFilter = currentFilter === 'all' || entry.verdict === currentFilter;
      const matchesSearch = !searchQuery || (entry.barcode || '').includes(searchQuery);
      return matchesFilter && matchesSearch;
    });
  }

  function render() {
    const filtered = getFiltered();
    container.innerHTML = '';

    if (filtered.length === 0) {
      container.innerHTML = '<p class="text-secondary" style="padding:var(--space-5)">no results for this filter</p>';
      return;
    }

    for (const entry of filtered) {
      const vc = VERDICT_CONFIG[entry.verdict] || VERDICT_CONFIG.safe;
      const row = document.createElement('div');
      row.className = 'history-row';
      row.setAttribute('role', 'button');
      row.setAttribute('tabindex', '0');
      row.setAttribute('aria-label', `${entry.barcode || 'unknown'}, ${vc.label}`);
      row.innerHTML = `
        <span class="history-row__verdict" aria-hidden="true">${vc.emoji}</span>
        <div class="history-row__info">
          <span class="history-row__barcode">${escapeHtml(entry.barcode || 'manual entry')}</span>
          <span class="history-row__date">${humanDate(entry.scannedAt)}</span>
        </div>
        <span class="history-row__known">${entry.knownIngredientPercent || 0}% recognised</span>
      `;

      // Load product name async
      if (entry.productId) {
        getProductById(entry.productId).then(product => {
          if (product) {
            row.querySelector('.history-row__barcode').textContent = product.name;
          }
        }).catch(() => {});
      }

      row.addEventListener('click', async () => {
        const product = entry.productId ? await getProductById(entry.productId) : null;
        if (product) {
          await showResultScreen(product.barcode, {
            found: true,
            name: product.name,
            brand: product.brand,
            ingredients: product.ingredients,
            rawIngredientsText: product.rawIngredientsText,
            allergenTags: product.allergenTags,
            imageUrl: ''
          });
        }
      });
      row.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') row.click(); });

      container.appendChild(row);
    }
  }

  // Inject search + filters above list
  const screen = document.getElementById('screen-history');
  let controlsEl = screen.querySelector('.history-controls');
  if (!controlsEl) {
    controlsEl = document.createElement('div');
    controlsEl.className = 'history-controls';
    controlsEl.innerHTML = `
      <input type="search" class="text-input" id="history-search" placeholder="search by name or barcode…" aria-label="Search history">
      <div class="filter-chips" role="group" aria-label="Filter by verdict">
        <button class="filter-chip filter-chip--active" data-filter="all">all</button>
        <button class="filter-chip" data-filter="safe">safe</button>
        <button class="filter-chip" data-filter="caution">caution</button>
        <button class="filter-chip" data-filter="warning">warning</button>
      </div>
    `;
    screen.querySelector('.screen-header').after(controlsEl);

    controlsEl.querySelectorAll('.filter-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        controlsEl.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('filter-chip--active'));
        chip.classList.add('filter-chip--active');
        currentFilter = chip.dataset.filter;
        render();
      });
    });

    document.getElementById('history-search').addEventListener('input', e => {
      searchQuery = e.target.value.trim().toLowerCase();
      render();
    });
  }

  render();
}

// ── Safe Foods screen ─────────────────────────────────────────────────────

async function renderSafeFoodsScreen() {
  showScreen('screen-safe');
  const container = document.getElementById('safe-list');
  container.innerHTML = '<p class="loading-text">loading…</p>';

  const products = await getSafeProducts();

  if (products.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <p class="empty-state__icon">🌿</p>
        <p class="empty-state__text">nothing here yet — scan something and mark it safe</p>
      </div>
    `;
    return;
  }

  container.innerHTML = '';
  for (const product of products) {
    const row = document.createElement('div');
    row.className = 'safe-row';
    row.setAttribute('role', 'button');
    row.setAttribute('tabindex', '0');
    row.setAttribute('aria-label', product.name);
    row.innerHTML = `
      <div class="safe-row__info">
        <span class="safe-row__name">${escapeHtml(product.name)}</span>
        <span class="safe-row__brand">${escapeHtml(product.brand || '')}</span>
      </div>
      <div class="safe-row__meta">
        <span class="safe-row__ingredients">${product.ingredients ? product.ingredients.length : 0} ingredients</span>
        <span class="safe-row__date">${humanDate(product.markedSafeAt)}</span>
      </div>
    `;
    row.addEventListener('click', async () => {
      await showResultScreen(product.barcode, {
        found: true,
        name: product.name,
        brand: product.brand,
        ingredients: product.ingredients,
        rawIngredientsText: product.rawIngredientsText,
        allergenTags: product.allergenTags,
        imageUrl: ''
      });
    });
    row.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') row.click(); });
    container.appendChild(row);
  }
}

// ── Settings screen ───────────────────────────────────────────────────────

async function renderSettingsScreen() {
  showScreen('screen-settings');
  const profile = window.APP_STATE.profile;
  const allergens = profile ? (profile.allergens || []) : [];

  const sensitivityHtml = allergens.length > 0
    ? allergens.map(a => `
        <div class="settings-sensitivity-row" data-key="${escapeHtml(a.key)}">
          <span class="settings-sensitivity__emoji">${escapeHtml(a.emoji || '')}</span>
          <div class="settings-sensitivity__info">
            <span class="settings-sensitivity__name">${escapeHtml(a.displayName)}</span>
            <span class="settings-sensitivity__confidence confidence--${a.confidence}">${a.confidence}</span>
          </div>
          <div class="settings-sensitivity__actions">
            <button class="btn btn--text settings-edit-btn" aria-label="Edit ${escapeHtml(a.displayName)}">edit</button>
            <button class="btn btn--text settings-delete-btn" aria-label="Remove ${escapeHtml(a.displayName)}">remove</button>
          </div>
        </div>
      `).join('')
    : '<p class="text-secondary">no sensitivities added yet</p>';

  const settingsContent = document.getElementById('settings-content');
  settingsContent.innerHTML = `
    <section class="settings-section">
      <h2 class="settings-section-heading">my sensitivities</h2>
      <div id="sensitivity-list">${sensitivityHtml}</div>
      <button class="btn btn--outline btn--block mt-3" id="add-sensitivity-btn">+ add another</button>
    </section>

    <section class="settings-section">
      <h2 class="settings-section-heading">data</h2>
      <button class="btn btn--outline btn--block" id="export-btn">export my data</button>
      <button class="btn btn--outline btn--block mt-2" id="import-btn">import data</button>
      <input type="file" id="import-file-input" accept=".json" style="display:none" aria-label="Import JSON file">
    </section>

    <section class="settings-section">
      <h2 class="settings-section-heading">about food.me</h2>
      <p class="settings-about-text">version 1.0.0</p>
      <p class="settings-about-text">a personal food confidence builder — not a medical tool</p>
      <p class="settings-disclaimer">this app does not provide medical advice</p>
    </section>

    <section class="settings-section">
      <h2 class="settings-section-heading">debug</h2>
      <div class="settings-toggle-row">
        <label class="settings-toggle-label" for="debug-toggle">debug mode</label>
        <button class="toggle-btn ${window.APP_STATE.debugMode ? 'toggle-btn--on' : ''}"
          id="debug-toggle"
          role="switch"
          aria-checked="${window.APP_STATE.debugMode}"
          aria-label="Toggle debug mode">
          ${window.APP_STATE.debugMode ? 'on' : 'off'}
        </button>
      </div>
    </section>
  `;

  // Edit / delete sensitivity handlers
  settingsContent.querySelectorAll('.settings-edit-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.closest('[data-key]').dataset.key;
      showEditSensitivityModal(key);
    });
  });

  settingsContent.querySelectorAll('.settings-delete-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.closest('[data-key]').dataset.key;
      showConfirmModal(
        `remove this sensitivity from your profile?`,
        'yes, remove',
        'keep it',
        async () => {
          const profile = window.APP_STATE.profile;
          profile.allergens = profile.allergens.filter(a => a.key !== key);
          await saveProfile({ allergens: profile.allergens });
          window.APP_STATE.profile = await getProfile();
          renderSettingsScreen();
        }
      );
    });
  });

  document.getElementById('add-sensitivity-btn').addEventListener('click', () => {
    showAddSensitivityModal();
  });

  document.getElementById('export-btn').addEventListener('click', async () => {
    const data = await exportAllData();
    if (data) {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `foodme-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('data exported');
    }
  });

  document.getElementById('import-btn').addEventListener('click', () => {
    document.getElementById('import-file-input').click();
  });

  document.getElementById('import-file-input').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      await importData(data);
      window.APP_STATE.profile = await getProfile();
      showToast('data imported successfully');
      renderSettingsScreen();
    } catch (err) {
      showToast('import failed — invalid file format');
    }
  });

  document.getElementById('debug-toggle').addEventListener('click', (e) => {
    window.APP_STATE.debugMode = !window.APP_STATE.debugMode;
    e.target.setAttribute('aria-checked', String(window.APP_STATE.debugMode));
    e.target.textContent = window.APP_STATE.debugMode ? 'on' : 'off';
    e.target.classList.toggle('toggle-btn--on', window.APP_STATE.debugMode);
    const debugBar = document.getElementById('debug-bar');
    if (debugBar) debugBar.style.display = window.APP_STATE.debugMode ? 'flex' : 'none';
    const debugScanSection = document.getElementById('debug-scan-section');
    if (debugScanSection) debugScanSection.style.display = window.APP_STATE.debugMode ? 'block' : 'none';

    // Enable/disable the in-app debugger
    if (typeof FoodMeDebugger !== 'undefined') {
      if (window.APP_STATE.debugMode) {
        FoodMeDebugger.enable();
        FoodMeDebugger.showPanel();
      } else {
        FoodMeDebugger.disable();
      }
    }
  });
}

function showEditSensitivityModal(key) {
  const profile = window.APP_STATE.profile;
  const sensitivity = profile.allergens.find(a => a.key === key);
  if (!sensitivity) return;

  const modal = document.getElementById('modal-overlay');
  modal.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true" aria-label="Edit ${sensitivity.displayName}">
      <h2 class="modal__heading">${sensitivity.emoji || ''} ${sensitivity.displayName}</h2>
      <p class="form-label">how much does this affect you?</p>
      <div class="confidence-options" role="radiogroup">
        <button class="confidence-pill ${sensitivity.confidence === 'definite' ? 'confidence-pill--selected' : ''}" data-value="definite" role="radio" aria-checked="${sensitivity.confidence === 'definite'}">always</button>
        <button class="confidence-pill ${sensitivity.confidence === 'likely' ? 'confidence-pill--selected' : ''}" data-value="likely" role="radio" aria-checked="${sensitivity.confidence === 'likely'}">usually</button>
        <button class="confidence-pill ${sensitivity.confidence === 'suspected' ? 'confidence-pill--selected' : ''}" data-value="suspected" role="radio" aria-checked="${sensitivity.confidence === 'suspected'}">sometimes</button>
      </div>
      <label class="form-label mt-4" for="edit-custom-keywords">custom keywords (comma-separated)</label>
      <input type="text" id="edit-custom-keywords" class="text-input" value="${(sensitivity.customKeywords || []).join(', ')}" aria-label="Custom keywords">
      <div class="modal__actions">
        <button class="btn btn--primary" id="edit-save-btn">save</button>
        <button class="btn btn--ghost" id="edit-cancel-btn">cancel</button>
      </div>
    </div>
  `;
  modal.style.display = 'flex';

  let selectedConfidence = sensitivity.confidence;

  modal.querySelectorAll('.confidence-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      selectedConfidence = pill.dataset.value;
      modal.querySelectorAll('.confidence-pill').forEach(p => {
        p.classList.toggle('confidence-pill--selected', p.dataset.value === selectedConfidence);
        p.setAttribute('aria-checked', p.dataset.value === selectedConfidence);
      });
    });
  });

  document.getElementById('edit-cancel-btn').addEventListener('click', () => {
    modal.style.display = 'none';
    modal.innerHTML = '';
  });

  document.getElementById('edit-save-btn').addEventListener('click', async () => {
    const customKeywordsRaw = document.getElementById('edit-custom-keywords').value;
    const customKeywords = customKeywordsRaw.split(',').map(k => k.trim()).filter(Boolean);

    const idx = profile.allergens.findIndex(a => a.key === key);
    if (idx > -1) {
      profile.allergens[idx].confidence = selectedConfidence;
      profile.allergens[idx].customKeywords = customKeywords;
      await saveProfile({ allergens: profile.allergens });
      window.APP_STATE.profile = await getProfile();
    }

    modal.style.display = 'none';
    modal.innerHTML = '';
    renderSettingsScreen();
    showToast('sensitivity updated');
  });
}

function showAddSensitivityModal() {
  const modal = document.getElementById('modal-overlay');
  modal.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true" aria-label="Add sensitivity">
      <h2 class="modal__heading">add a sensitivity</h2>
      <div class="search-input-wrap">
        <input type="text" id="add-sens-input" class="text-input" placeholder="type a food..." autocomplete="off" aria-label="Search for a sensitivity">
        <div class="suggestion-chips" id="add-sens-suggestions" role="listbox"></div>
      </div>
      <div id="add-sens-selected" class="custom-sensitivity-list"></div>
      <div class="modal__actions">
        <button class="btn btn--primary" id="add-sens-save">add</button>
        <button class="btn btn--ghost" id="add-sens-cancel">cancel</button>
      </div>
    </div>
  `;
  modal.style.display = 'flex';

  let pendingAdd = null;
  const profile = window.APP_STATE.profile;
  const existingKeys = profile.allergens.map(a => a.key);

  document.getElementById('add-sens-input').addEventListener('input', (e) => {
    const query = e.target.value.trim();
    const suggestionsEl = document.getElementById('add-sens-suggestions');
    suggestionsEl.innerHTML = '';
    if (!query || query.length < 2) return;

    const matches = fuzzyMatchSensitivities(query).filter(m => !existingKeys.includes(m.key));
    for (const match of matches) {
      const chip = document.createElement('button');
      chip.className = 'suggestion-chip';
      chip.innerHTML = `${match.emoji} ${match.displayName}`;
      chip.addEventListener('click', () => {
        pendingAdd = match;
        suggestionsEl.innerHTML = '';
        document.getElementById('add-sens-input').value = '';
        const selected = document.getElementById('add-sens-selected');
        selected.innerHTML = `<div class="sensitivity-chip"><span>${match.emoji}</span><span>${match.displayName}</span></div>`;
      });
      suggestionsEl.appendChild(chip);
    }
  });

  document.getElementById('add-sens-cancel').addEventListener('click', () => {
    modal.style.display = 'none';
    modal.innerHTML = '';
  });

  document.getElementById('add-sens-save').addEventListener('click', async () => {
    if (!pendingAdd) return;

    const entry = SENSITIVITY_DICTIONARY[pendingAdd.key];
    profile.allergens.push({
      key: pendingAdd.key,
      displayName: pendingAdd.displayName,
      emoji: pendingAdd.emoji || '',
      confidence: 'suspected',
      tier: pendingAdd.tier || 'custom',
      keywords: entry ? entry.keywords : [],
      customKeywords: []
    });

    await saveProfile({ allergens: profile.allergens });
    window.APP_STATE.profile = await getProfile();
    modal.style.display = 'none';
    modal.innerHTML = '';
    renderSettingsScreen();
    showToast('sensitivity added');
  });
}

// ── Debug bar ─────────────────────────────────────────────────────────────

async function updateDebugBar() {
  const bar = document.getElementById('debug-bar');
  if (!bar) return;
  bar.style.display = window.APP_STATE.debugMode ? 'flex' : 'none';
  if (!window.APP_STATE.debugMode) return;

  const counts = await getDbCounts();
  bar.innerHTML = `
    <span>screen: ${currentScreen || '—'}</span>
    <span>barcode: ${window.APP_STATE.lastBarcode || '—'}</span>
    <span>api: ${window.APP_STATE.lastApiResult ? (window.APP_STATE.lastApiResult.found ? 'found' : window.APP_STATE.lastApiResult.error) : '—'}</span>
    <span>db: p=${counts.profile} pr=${counts.products} h=${counts.scanHistory} i=${counts.ingredientIndex}</span>
  `;
}

// ── Modal helpers ─────────────────────────────────────────────────────────

function showConfirmModal(message, confirmLabel, cancelLabel, onConfirm) {
  const modal = document.getElementById('modal-overlay');
  modal.innerHTML = `
    <div class="modal modal--confirm" role="dialog" aria-modal="true">
      <p class="modal__message">${escapeHtml(message)}</p>
      <div class="modal__actions">
        <button class="btn btn--primary" id="confirm-yes">${escapeHtml(confirmLabel)}</button>
        <button class="btn btn--ghost" id="confirm-no">${escapeHtml(cancelLabel)}</button>
      </div>
    </div>
  `;
  modal.style.display = 'flex';

  document.getElementById('confirm-yes').addEventListener('click', () => {
    modal.style.display = 'none';
    modal.innerHTML = '';
    onConfirm();
  });
  document.getElementById('confirm-no').addEventListener('click', () => {
    modal.style.display = 'none';
    modal.innerHTML = '';
  });
}

function showLoadingOverlay(message) {
  const overlay = document.getElementById('loading-overlay');
  if (overlay) {
    overlay.querySelector('.loading-overlay__text').textContent = message;
    overlay.style.display = 'flex';
  }
}

function hideLoadingOverlay() {
  const overlay = document.getElementById('loading-overlay');
  if (overlay) overlay.style.display = 'none';
}

function showErrorState(message, onRetry) {
  const container = document.getElementById('result-content');
  if (container) {
    container.innerHTML = `
      <div class="error-state">
        <p class="error-state__icon">⚠️</p>
        <p class="error-state__message">${escapeHtml(message)}</p>
        <button class="btn btn--primary" id="error-retry-btn">try again</button>
      </div>
    `;
    showScreen('screen-result');
    document.getElementById('error-retry-btn').addEventListener('click', onRetry);
  }
}

let toastTimeout;
function showToast(message) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add('toast--visible');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.remove('toast--visible'), 2500);
}

// ── Utility ───────────────────────────────────────────────────────────────

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
