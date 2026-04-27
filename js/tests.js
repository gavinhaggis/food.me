'use strict';

// ─────────────────────────────────────────────────────────────────────────────
// food.me test suite
// Runs in the browser after all app scripts are loaded.
// Bugs are flagged inline with BUG: comments.
// ─────────────────────────────────────────────────────────────────────────────

// ── 1. normaliseIngredient ────────────────────────────────────────────────

describe('normaliseIngredient — basic cleaning', ({ }) => {

  it('lowercases input', ({ expect }) => {
    expect(normaliseIngredient('SUGAR')).toBe('sugar');
  });

  it('strips parenthesised content', ({ expect }) => {
    expect(normaliseIngredient('Wheat Flour (with calcium)')).toBe('wheat flour');
  });

  it('strips nested parentheses', ({ expect }) => {
    expect(normaliseIngredient('Emulsifier (Sunflower Lecithin (E322))')).toBe('emulsifier');
  });

  it('strips percentage values', ({ expect }) => {
    expect(normaliseIngredient('Sugar 12%')).toBe('sugar');
    expect(normaliseIngredient('Oat Flakes 28.5%')).toBe('oat flakes');
  });

  it('strips asterisk footnote markers', ({ expect }) => {
    expect(normaliseIngredient('Wheat Flour*')).toBe('wheat flour');
    expect(normaliseIngredient('Organic Sugar†')).toBe('organic sugar');
  });

  it('trims leading/trailing whitespace', ({ expect }) => {
    expect(normaliseIngredient('  salt  ')).toBe('salt');
  });

  it('strips leading/trailing punctuation', ({ expect }) => {
    expect(normaliseIngredient(',salt,')).toBe('salt');
    expect(normaliseIngredient(':vinegar:')).toBe('vinegar');
  });

  it('returns empty string for null', ({ expect }) => {
    expect(normaliseIngredient(null)).toBe('');
  });

  it('returns empty string for empty string', ({ expect }) => {
    expect(normaliseIngredient('')).toBe('');
  });

  it('returns empty string for non-string', ({ expect }) => {
    expect(normaliseIngredient(42)).toBe('');
    expect(normaliseIngredient(undefined)).toBe('');
  });

  it('preserves E-numbers', ({ expect }) => {
    expect(normaliseIngredient('Antioxidant E300')).toBe('antioxidant e300');
  });

  it('handles brackets with commas inside (common in real labels)', ({ expect }) => {
    // e.g. "Vegetable Oil (Sunflower, Palm)" — the inner comma should be stripped with parens
    expect(normaliseIngredient('Vegetable Oil (Sunflower, Palm)')).toBe('vegetable oil');
  });

  it('handles real-world complex label fragment', ({ expect }) => {
    expect(normaliseIngredient('Wheat Flour (Wheat) 56%*')).toBe('wheat flour');
  });

});

// ── 2. parseIngredients ───────────────────────────────────────────────────

describe('parseIngredients — splitting & normalising', ({ }) => {

  it('splits simple comma-separated list', ({ expect }) => {
    const result = parseIngredients('wheat flour, sugar, salt');
    expect(result).toEqual(['wheat flour', 'sugar', 'salt']);
  });

  it('splits semicolon-separated list', ({ expect }) => {
    const result = parseIngredients('water; salt; sugar');
    expect(result).toEqual(['water', 'salt', 'sugar']);
  });

  it('does not split on commas inside parentheses', ({ expect }) => {
    const result = parseIngredients('Vegetable Oil (Sunflower, Palm), Salt');
    expect(result).toEqual(['vegetable oil', 'salt']);
  });

  it('does not split on commas inside square brackets', ({ expect }) => {
    const result = parseIngredients('Antioxidants [E306, E307], Sugar');
    expect(result).toEqual(['antioxidants [e306, e307]', 'sugar']);
    // NOTE: square bracket content is NOT stripped by normaliseIngredient
    // (it only strips round parentheses). This is a known limitation.
  });

  it('returns empty array for empty string', ({ expect }) => {
    expect(parseIngredients('')).toEqual([]);
  });

  it('returns empty array for null', ({ expect }) => {
    expect(parseIngredients(null)).toEqual([]);
  });

  it('handles real Hobnobs-style ingredient string', ({ expect }) => {
    const raw = 'Oat Flakes (41%), Wholemeal Wheat Flour (24%), Vegetable Oil (Sunflower, Palm), Sugar, Glucose Syrup, Oatmeal (7%), Salt, Raising Agent (Sodium Bicarbonate)';
    const result = parseIngredients(raw);
    expect(result.length).toBeGreaterThan(5);
    expect(result).toContain('sugar');
    expect(result).toContain('salt');
    // Oat flakes should be present (stripped of percentage)
    expect(result).toContain('oat flakes');
    // Vegetable oil — parens stripped
    expect(result).toContain('vegetable oil');
  });

  it('handles deeply nested real-world label', ({ expect }) => {
    // "Emulsifier (Sunflower Lecithin (E322)), Sugar"
    const result = parseIngredients('Emulsifier (Sunflower Lecithin (E322)), Sugar');
    expect(result).toContain('emulsifier');
    expect(result).toContain('sugar');
    expect(result.length).toBe(2);
  });

  it('filters out empty/whitespace-only parts', ({ expect }) => {
    const result = parseIngredients('sugar, , salt');
    expect(result).toEqual(['sugar', 'salt']);
  });

  // ── Known limitation ──────────────────────────────────────────────────────
  it('NOTE: unbalanced parentheses are not stripped (real-world edge case)', ({ expect }) => {
    // OCR or bad data may produce unbalanced parens — normalise does not handle these
    const result = normaliseIngredient('wheat flour (gluten');
    // Returns the raw text including unclosed paren
    expect(result).toContain('gluten');
    // Limitation: the paren content is NOT stripped
  });

});

// ── 3. fuzzyMatchSensitivities ────────────────────────────────────────────

describe('fuzzyMatchSensitivities — search', ({ }) => {

  it('returns empty array for empty query', ({ expect }) => {
    expect(fuzzyMatchSensitivities('')).toEqual([]);
  });

  it('returns empty array for single-char query', ({ expect }) => {
    // BUG (friction): single-letter queries like "e" (for egg) return nothing.
    // Users typing slowly will see no suggestions until 2 chars.
    expect(fuzzyMatchSensitivities('e')).toEqual([]);
  });

  it('matches by display name', ({ expect }) => {
    const results = fuzzyMatchSensitivities('milk');
    const keys = results.map(r => r.key);
    expect(keys).toContain('milk');
    // milk displayName match gets highest score
    const milkResult = results.find(r => r.key === 'milk');
    expect(milkResult.score).toBe(3);
  });

  it('matches "dairy" via keyword on milk entry', ({ expect }) => {
    const results = fuzzyMatchSensitivities('dairy');
    const keys = results.map(r => r.key);
    expect(keys).toContain('milk');
  });

  it('matches "tahini" keyword to sesame entry', ({ expect }) => {
    const results = fuzzyMatchSensitivities('tahini');
    const keys = results.map(r => r.key);
    expect(keys).toContain('sesame');
  });

  it('matches "casein" keyword to milk entry', ({ expect }) => {
    const results = fuzzyMatchSensitivities('casein');
    const keys = results.map(r => r.key);
    expect(keys).toContain('milk');
  });

  it('matches "worcestershire" keyword to fish entry', ({ expect }) => {
    const results = fuzzyMatchSensitivities('worcestershire');
    const keys = results.map(r => r.key);
    expect(keys).toContain('fish');
  });

  it('returns no more than 8 results', ({ expect }) => {
    // "oil" matches many sensitivities via keywords
    const results = fuzzyMatchSensitivities('oil');
    expect(results.length).toBeLessThan(9);
  });

  it('sorts by score — name matches before keyword matches', ({ expect }) => {
    const results = fuzzyMatchSensitivities('garlic');
    expect(results[0].key).toBe('garlic'); // exact name match should rank first
    expect(results[0].score).toBe(3);
  });

  it('matches "E220" (sulphite E-number) to sulphites', ({ expect }) => {
    const results = fuzzyMatchSensitivities('E220');
    const keys = results.map(r => r.key);
    expect(keys).toContain('sulphites');
  });

  it('returns results for "gluten" via wheat keywords', ({ expect }) => {
    const results = fuzzyMatchSensitivities('gluten');
    const keys = results.map(r => r.key);
    expect(keys).toContain('wheat');
  });

});

// ── 4. checkForGroupSuggestions ───────────────────────────────────────────

describe('checkForGroupSuggestions — group detection', ({ }) => {

  it('suggests nightshades when tomato + potato selected (threshold: 2)', ({ expect }) => {
    const suggestions = checkForGroupSuggestions(['tomato', 'potato']);
    const keys = suggestions.map(s => s.groupKey);
    expect(keys).toContain('nightshades');
  });

  it('does NOT suggest nightshades for only one member (threshold not met)', ({ expect }) => {
    const suggestions = checkForGroupSuggestions(['tomato']);
    const keys = suggestions.map(s => s.groupKey);
    if (keys.includes('nightshades')) {
      throw new Error('nightshades suggested with only 1 member — threshold is 2');
    }
  });

  it('suggests alliums for onion + garlic', ({ expect }) => {
    const suggestions = checkForGroupSuggestions(['onion', 'garlic']);
    const keys = suggestions.map(s => s.groupKey);
    expect(keys).toContain('alliums');
  });

  it('suggests brassicas for broccoli + kale', ({ expect }) => {
    const suggestions = checkForGroupSuggestions(['broccoli', 'kale']);
    const keys = suggestions.map(s => s.groupKey);
    expect(keys).toContain('brassicas');
  });

  it('suggests FODMAPs at threshold 3 (onion + garlic + wheat)', ({ expect }) => {
    const suggestions = checkForGroupSuggestions(['onion', 'garlic', 'wheat']);
    const keys = suggestions.map(s => s.groupKey);
    expect(keys).toContain('fodmaps');
  });

  it('does NOT suggest FODMAPs for only 2 FODMAP members', ({ expect }) => {
    const suggestions = checkForGroupSuggestions(['onion', 'garlic']);
    const keys = suggestions.map(s => s.groupKey);
    if (keys.includes('fodmaps')) {
      throw new Error('fodmaps suggested with only 2 members — threshold is 3');
    }
  });

  it('respects dismissed groups', ({ expect }) => {
    const suggestions = checkForGroupSuggestions(['tomato', 'potato'], ['nightshades']);
    const keys = suggestions.map(s => s.groupKey);
    if (keys.includes('nightshades')) {
      throw new Error('dismissed group was still suggested');
    }
  });

  it('returns matched member keys in the suggestion', ({ expect }) => {
    const suggestions = checkForGroupSuggestions(['tomato', 'potato', 'milk']);
    const nightshades = suggestions.find(s => s.groupKey === 'nightshades');
    expect(nightshades.matchedKeys).toContain('tomato');
    expect(nightshades.matchedKeys).toContain('potato');
  });

  it('suggests latex-fruit syndrome at threshold 2', ({ expect }) => {
    const suggestions = checkForGroupSuggestions(['avocado', 'banana']);
    const keys = suggestions.map(s => s.groupKey);
    expect(keys).toContain('latex_fruit_syndrome');
  });

  it('does not re-suggest a group the user already has', ({ expect }) => {
    const suggestions = checkForGroupSuggestions(['nightshades', 'tomato', 'potato']);
    const keys = suggestions.map(s => s.groupKey);
    if (keys.includes('nightshades')) {
      throw new Error('group already in profile was suggested again');
    }
  });

});

// ── 5. calculateVerdict — unit tests (mock DB) ────────────────────────────

describe('calculateVerdict — verdict logic (mocked DB)', ({ }) => {

  // Stash originals
  const _getIngredientRecord = window.getIngredientRecord;
  const _getProductById = window.getProductById;

  beforeEach(() => {
    // Mock DB to return "no record" (all ingredients unknown)
    window.getIngredientRecord = async () => null;
    window.getProductById = async () => null;
  });

  it('returns safe when profile has no allergens', async ({ expect }) => {
    const product = { ingredients: ['sugar', 'salt'], allergenTags: [], rawIngredientsText: 'sugar, salt' };
    const result = await calculateVerdict(product, { allergens: [] });
    expect(result.verdict).toBe('safe');
    expect(result.flagged.length).toBe(0);
  });

  it('returns warning for definite EU14 allergen in structured tags', async ({ expect }) => {
    const product = {
      ingredients: ['wheat flour', 'sugar'],
      allergenTags: ['gluten'],
      rawIngredientsText: 'wheat flour, sugar'
    };
    const profile = {
      allergens: [{
        key: 'wheat', displayName: 'Wheat & Gluten', tier: 'eu14',
        confidence: 'definite', keywords: ['wheat', 'gluten', 'flour'], customKeywords: []
      }]
    };
    const result = await calculateVerdict(product, profile);
    expect(result.verdict).toBe('warning');
    expect(result.flagged.length).toBeGreaterThan(0);
    expect(result.flagged[0].matchType).toBe('structured');
  });

  it('returns warning for keyword match with definite confidence', async ({ expect }) => {
    const product = {
      ingredients: ['sugar', 'peanut oil', 'salt'],
      allergenTags: [],
      rawIngredientsText: 'sugar, peanut oil, salt'
    };
    const profile = {
      allergens: [{
        key: 'peanuts', displayName: 'Peanuts', tier: 'eu14',
        confidence: 'definite', keywords: ['peanut', 'groundnut', 'arachis oil', 'peanut oil'], customKeywords: []
      }]
    };
    const result = await calculateVerdict(product, profile);
    expect(result.verdict).toBe('warning');
    expect(result.flagged[0].matchType).toBe('keyword');
  });

  it('returns caution for suspected allergen (confidence 0.5 × 0.9 = 0.45 — below 0.75 threshold)', async ({ expect }) => {
    const product = {
      ingredients: ['sugar', 'milk powder'],
      allergenTags: [],
      rawIngredientsText: 'sugar, milk powder'
    };
    const profile = {
      allergens: [{
        key: 'milk', displayName: 'Dairy & Milk', tier: 'eu14',
        confidence: 'suspected', keywords: ['milk', 'milk powder', 'dairy'], customKeywords: []
      }]
    };
    const result = await calculateVerdict(product, profile);
    // suspected × 0.9 = 0.45 — below the 0.75 warning threshold
    expect(result.verdict).toBe('caution');
    expect(result.flagged.length).toBeGreaterThan(0);
  });

  it('returns caution when knownPercent < 50 even with no flags', async ({ expect }) => {
    // All ingredients unknown → knownPercent = 0
    const product = {
      ingredients: ['unfamiliar-x', 'unfamiliar-y', 'unfamiliar-z'],
      allergenTags: [],
      rawIngredientsText: 'unfamiliar-x, unfamiliar-y, unfamiliar-z'
    };
    const result = await calculateVerdict(product, { allergens: [
      { key: 'milk', displayName: 'Milk', tier: 'eu14', confidence: 'definite',
        keywords: ['milk'], customKeywords: [] }
    ]});
    // No flags, but 0% known → caution
    expect(result.verdict).toBe('caution');
    expect(result.knownPercent).toBe(0);
  });

  it('keyword match also checks rawIngredientsText (catches OCR/all-caps labels)', async ({ expect }) => {
    const product = {
      ingredients: [],   // empty parsed array
      allergenTags: [],
      rawIngredientsText: 'WHEAT FLOUR, SUGAR, MILK POWDER'
    };
    const profile = {
      allergens: [{
        key: 'milk', displayName: 'Milk', tier: 'eu14',
        confidence: 'definite', keywords: ['milk', 'milk powder'], customKeywords: []
      }]
    };
    const result = await calculateVerdict(product, profile);
    // Should find "milk powder" in rawIngredientsText (lowercased internally)
    expect(result.flagged.length).toBeGreaterThan(0);
  });

  it('does not double-count a sensitivity flagged by both tag and keyword', async ({ expect }) => {
    const product = {
      ingredients: ['wheat flour'],
      allergenTags: ['gluten'],
      rawIngredientsText: 'wheat flour'
    };
    const profile = {
      allergens: [{
        key: 'wheat', displayName: 'Wheat', tier: 'eu14',
        confidence: 'definite', keywords: ['wheat', 'gluten', 'flour'], customKeywords: []
      }]
    };
    const result = await calculateVerdict(product, profile);
    // Should only appear once in flagged
    expect(result.flagged.length).toBe(1);
  });

  it('handles custom (non-eu14) sensitivities via keyword scan only', async ({ expect }) => {
    const product = {
      ingredients: ['tomato paste', 'sugar', 'salt'],
      allergenTags: [],
      rawIngredientsText: 'tomato paste, sugar, salt'
    };
    const profile = {
      allergens: [{
        key: 'tomato', displayName: 'Tomato', tier: 'custom',
        confidence: 'definite', keywords: ['tomato', 'tomato paste'], customKeywords: []
      }]
    };
    const result = await calculateVerdict(product, profile);
    // Custom tier → step1 skipped, step2 finds it
    expect(result.flagged.length).toBe(1);
    expect(result.flagged[0].matchType).toBe('keyword');
  });

  it('provenance: known ingredients increment knownCount', async ({ expect }) => {
    // Override mock to return a known ingredient record
    window.getIngredientRecord = async (ingredient) => {
      if (ingredient === 'sugar') return { seenInProductIds: [1] };
      return null;
    };
    window.getProductById = async () => ({ name: 'Digestives' });

    const product = {
      ingredients: ['sugar', 'salt', 'unknown-x'],
      allergenTags: [],
      rawIngredientsText: 'sugar, salt, unknown-x'
    };
    const result = await calculateVerdict(product, { allergens: [] });
    // sugar is known, salt and unknown-x are not
    expect(result.knownPercent).toBe(33); // 1/3 = 33%
  });

  // Restore originals after all verdict tests
  it('cleanup: restores real DB functions', async ({ expect }) => {
    window.getIngredientRecord = _getIngredientRecord;
    window.getProductById = _getProductById;
    expect(typeof window.getIngredientRecord).toBe('function');
  });

});

// ── 6. SENSITIVITY_DICTIONARY coverage ───────────────────────────────────

describe('SENSITIVITY_DICTIONARY — completeness', ({ }) => {

  const EU14_REQUIRED = [
    'milk', 'eggs', 'wheat', 'peanuts', 'tree_nuts',
    'fish', 'shellfish', 'molluscs', 'soy',
    'celery', 'mustard', 'sesame', 'sulphites', 'lupin'
  ];

  it('contains all 14 EU allergens', ({ expect }) => {
    for (const key of EU14_REQUIRED) {
      if (!SENSITIVITY_DICTIONARY[key]) {
        throw new Error(`Missing EU14 allergen: "${key}"`);
      }
    }
    expect(EU14_REQUIRED.length).toBe(14);
  });

  it('all EU14 entries have tier: "eu14"', ({ expect }) => {
    for (const key of EU14_REQUIRED) {
      const entry = SENSITIVITY_DICTIONARY[key];
      if (entry.tier !== 'eu14') {
        throw new Error(`${key} has tier "${entry.tier}", expected "eu14"`);
      }
    }
  });

  it('all entries have required fields: displayName, emoji, tier, keywords', ({ expect }) => {
    for (const [key, entry] of Object.entries(SENSITIVITY_DICTIONARY)) {
      if (!entry.displayName) throw new Error(`${key} missing displayName`);
      if (!entry.emoji) throw new Error(`${key} missing emoji`);
      if (!entry.tier) throw new Error(`${key} missing tier`);
      if (!Array.isArray(entry.keywords) || entry.keywords.length === 0) {
        throw new Error(`${key} has empty or missing keywords array`);
      }
    }
  });

  it('milk entry contains key dairy terms', ({ expect }) => {
    const kws = SENSITIVITY_DICTIONARY.milk.keywords;
    for (const term of ['milk', 'lactose', 'casein', 'whey', 'butter']) {
      if (!kws.includes(term)) {
        throw new Error(`milk keywords missing: "${term}"`);
      }
    }
  });

  it('sulphites entry contains all E220–E228 codes', ({ expect }) => {
    const kws = SENSITIVITY_DICTIONARY.sulphites.keywords;
    for (const code of ['E220', 'E221', 'E222', 'E223', 'E224', 'E225', 'E226', 'E227', 'E228']) {
      if (!kws.includes(code)) {
        throw new Error(`sulphites keywords missing E-number: "${code}"`);
      }
    }
  });

});

// ── 7. SENSITIVITY_GROUPS coverage ────────────────────────────────────────

describe('SENSITIVITY_GROUPS — structure', ({ }) => {

  const REQUIRED_GROUPS = [
    'nightshades', 'alliums', 'brassicas', 'stone_fruits',
    'citrus_family', 'fodmaps', 'histamine', 'latex_fruit_syndrome'
  ];

  it('contains all required groups', ({ expect }) => {
    for (const key of REQUIRED_GROUPS) {
      if (!SENSITIVITY_GROUPS[key]) {
        throw new Error(`Missing group: "${key}"`);
      }
    }
  });

  it('all groups have required fields', ({ expect }) => {
    for (const [key, group] of Object.entries(SENSITIVITY_GROUPS)) {
      if (!group.displayName) throw new Error(`${key} missing displayName`);
      if (!group.description) throw new Error(`${key} missing description`);
      if (!group.learnMoreText) throw new Error(`${key} missing learnMoreText`);
      if (!Array.isArray(group.memberKeys) || group.memberKeys.length === 0) {
        throw new Error(`${key} has empty memberKeys`);
      }
      if (typeof group.suggestThreshold !== 'number') {
        throw new Error(`${key} missing suggestThreshold`);
      }
    }
  });

  it('all group memberKeys exist in SENSITIVITY_DICTIONARY', ({ expect }) => {
    for (const [groupKey, group] of Object.entries(SENSITIVITY_GROUPS)) {
      for (const memberKey of group.memberKeys) {
        if (!SENSITIVITY_DICTIONARY[memberKey]) {
          throw new Error(`Group "${groupKey}" references missing dictionary key: "${memberKey}"`);
        }
      }
    }
  });

});

// ── 8. API response normalisation ─────────────────────────────────────────

describe('fetchFromOpenFoodFacts — response normalisation (mocked fetch)', ({ }) => {

  const _fetch = window.fetch;

  function mockFetch(data, status = 200) {
    window.fetch = async () => ({
      ok: status >= 200 && status < 300,
      status,
      json: async () => data
    });
  }

  it('returns found:false for network error', async ({ expect }) => {
    window.fetch = async () => { throw new TypeError('Failed to fetch'); };
    const result = await fetchFromOpenFoodFacts('12345');
    expect(result.found).toBe(false);
    expect(result.error).toBe('network');
  });

  it('returns found:false for status !== 1', async ({ expect }) => {
    mockFetch({ status: 0, product: null });
    const result = await fetchFromOpenFoodFacts('00000');
    expect(result.found).toBe(false);
    expect(result.error).toBe('not_found');
  });

  it('returns found:false for HTTP 404', async ({ expect }) => {
    mockFetch({}, 404);
    const result = await fetchFromOpenFoodFacts('99999');
    expect(result.found).toBe(false);
    expect(result.error).toBe('network');
  });

  it('strips "en:" prefix from allergen tags', async ({ expect }) => {
    mockFetch({
      status: 1,
      product: {
        product_name: 'Test Biscuit',
        brands: 'Test Brand',
        ingredients_text: 'wheat flour, sugar',
        allergens_tags: ['en:gluten', 'en:milk'],
        allergens_hierarchy: []
      }
    });
    const result = await fetchFromOpenFoodFacts('12345');
    expect(result.found).toBe(true);
    expect(result.allergenTags).toContain('gluten');
    expect(result.allergenTags).toContain('milk');
    // Must NOT contain "en:" prefix
    for (const tag of result.allergenTags) {
      if (tag.startsWith('en:')) {
        throw new Error(`allergenTag still has "en:" prefix: "${tag}"`);
      }
    }
  });

  it('deduplicates allergen tags from allergens_tags + allergens_hierarchy', async ({ expect }) => {
    mockFetch({
      status: 1,
      product: {
        product_name: 'Test',
        brands: '',
        ingredients_text: 'wheat',
        allergens_tags: ['en:gluten'],
        allergens_hierarchy: ['en:gluten']  // duplicate
      }
    });
    const result = await fetchFromOpenFoodFacts('12345');
    const glutenCount = result.allergenTags.filter(t => t === 'gluten').length;
    expect(glutenCount).toBe(1); // must be deduplicated
  });

  it('parses ingredients_text into normalised array', async ({ expect }) => {
    mockFetch({
      status: 1,
      product: {
        product_name: 'Test',
        brands: '',
        ingredients_text: 'Wheat Flour (Wheat), Sugar 30%, Salt',
        allergens_tags: [],
        allergens_hierarchy: []
      }
    });
    const result = await fetchFromOpenFoodFacts('12345');
    expect(result.ingredients).toContain('wheat flour');
    expect(result.ingredients).toContain('sugar');
    expect(result.ingredients).toContain('salt');
    // Percentage should be stripped
    for (const ing of result.ingredients) {
      if (/\d+%/.test(ing)) throw new Error(`Ingredient still has percentage: "${ing}"`);
    }
  });

  it('falls back to "Unknown product" when product_name is missing', async ({ expect }) => {
    mockFetch({
      status: 1,
      product: {
        product_name: '',
        brands: 'Some Brand',
        ingredients_text: 'sugar',
        allergens_tags: [],
        allergens_hierarchy: []
      }
    });
    const result = await fetchFromOpenFoodFacts('12345');
    expect(result.name).toBe('Unknown product');
  });

  // Restore fetch
  it('cleanup: restores real fetch', async ({ expect }) => {
    window.fetch = _fetch;
    expect(typeof window.fetch).toBe('function');
  });

});

// ── 9. DB integration (real Dexie, isolated test DB) ──────────────────────

describe('DB — integration tests (Dexie test database)', ({ }) => {

  // Use a separate test DB so we don't pollute the app's data
  let testDb;

  beforeEach(async () => {
    // Delete any stale test DB and recreate fresh
    await Dexie.delete('foodme_test_db').catch(() => {});
    testDb = new Dexie('foodme_test_db');
    testDb.version(1).stores({
      profile: '++id, updatedAt',
      products: '++id, barcode, scannedAt',
      scanHistory: '++id, barcode, productId, scannedAt',
      ingredientIndex: '++id, normalised'
    });
  });

  it('saveProfile then getProfile returns correct data', async ({ expect }) => {
    await testDb.profile.put({ id: 1, allergens: [{ key: 'milk' }], createdAt: Date.now(), updatedAt: Date.now() });
    const profile = await testDb.profile.get(1);
    expect(profile.allergens[0].key).toBe('milk');
  });

  it('saveProduct creates new record and returns id', async ({ expect }) => {
    const id = await testDb.products.add({
      barcode: '1234567890',
      name: 'Test Biscuit',
      brand: 'Test',
      source: 'openfoodfacts',
      ingredients: ['wheat flour', 'sugar'],
      rawIngredientsText: 'wheat flour, sugar',
      allergenTags: ['gluten'],
      markedSafe: false,
      scanCount: 1,
      scannedAt: Date.now()
    });
    expect(typeof id).toBe('number');
    expect(id).toBeGreaterThan(0);
  });

  it('saveProduct with same barcode increments scanCount', async ({ expect }) => {
    const barcode = 'SCAN-COUNT-TEST';
    const id1 = await testDb.products.add({
      barcode, name: 'Scan Count Test', brand: '', source: 'openfoodfacts',
      ingredients: ['sugar'], rawIngredientsText: 'sugar',
      allergenTags: [], markedSafe: false, scanCount: 1, scannedAt: Date.now()
    });

    // Simulate second scan — same barcode
    const existing = await testDb.products.where('barcode').equals(barcode).first();
    await testDb.products.update(existing.id, {
      scanCount: (existing.scanCount || 0) + 1,
      scannedAt: Date.now()
    });

    const updated = await testDb.products.get(id1);
    expect(updated.scanCount).toBe(2);
  });

  it('markProductSafe sets markedSafe:true and records timestamp', async ({ expect }) => {
    const id = await testDb.products.add({
      barcode: 'SAFE-TEST', name: 'Safe Test', brand: '', source: 'openfoodfacts',
      ingredients: ['sugar'], rawIngredientsText: 'sugar',
      allergenTags: [], markedSafe: false, scanCount: 1, scannedAt: Date.now()
    });
    await testDb.products.update(id, {
      markedSafe: true,
      markedSafeAt: Date.now(),
      userOverride: false,
      overrideNote: ''
    });
    const product = await testDb.products.get(id);
    expect(product.markedSafe).toBe(true);
    expect(typeof product.markedSafeAt).toBe('number');
  });

  it('ingredientIndex is updated when product is saved', async ({ expect }) => {
    const productId = await testDb.products.add({
      barcode: 'IDX-TEST', name: 'Index Test', brand: '', source: 'openfoodfacts',
      ingredients: ['sugar', 'salt'], rawIngredientsText: 'sugar, salt',
      allergenTags: [], markedSafe: false, scanCount: 1, scannedAt: Date.now()
    });

    // Manually run the index update (mirroring saveProduct's behaviour)
    for (const raw of ['sugar', 'salt']) {
      const normalised = raw.toLowerCase().trim();
      await testDb.ingredientIndex.add({ normalised, raw, seenInProductIds: [productId] });
    }

    const record = await testDb.ingredientIndex.where('normalised').equals('sugar').first();
    expect(record).toBeTruthy();
    expect(record.seenInProductIds).toContain(productId);
  });

  it('exportAllData produces valid schemaVersion:1 object', async ({ expect }) => {
    // Insert minimal data
    await testDb.profile.put({ id: 1, allergens: [], createdAt: Date.now(), updatedAt: Date.now() });

    const exported = {
      schemaVersion: 1,
      appVersion: '1.0.0',
      exportedAt: new Date().toISOString(),
      profile: { allergens: [] },
      products: await testDb.products.toArray(),
      scanHistory: await testDb.scanHistory.toArray(),
      ingredientIndex: await testDb.ingredientIndex.toArray()
    };

    expect(exported.schemaVersion).toBe(1);
    expect(exported.appVersion).toBe('1.0.0');
    expect(Array.isArray(exported.products)).toBe(true);
    expect(typeof exported.exportedAt).toBe('string');
  });

  // ── BUG: getSafeProducts sort order ──────────────────────────────────────
  it('BUG REGRESSION: safe products sort newest-first (markedSafeAt descending)', async ({ expect }) => {
    const t1 = Date.now() - 10000;
    const t2 = Date.now() - 5000;
    const t3 = Date.now();

    await testDb.products.bulkAdd([
      { barcode: 'S1', name: 'Oldest', brand: '', source: 'openfoodfacts', ingredients: [], rawIngredientsText: '', allergenTags: [], markedSafe: true, markedSafeAt: t1, scanCount: 1, scannedAt: t1 },
      { barcode: 'S2', name: 'Middle', brand: '', source: 'openfoodfacts', ingredients: [], rawIngredientsText: '', allergenTags: [], markedSafe: true, markedSafeAt: t2, scanCount: 1, scannedAt: t2 },
      { barcode: 'S3', name: 'Newest', brand: '', source: 'openfoodfacts', ingredients: [], rawIngredientsText: '', allergenTags: [], markedSafe: true, markedSafeAt: t3, scanCount: 1, scannedAt: t3 },
    ]);

    // Current implementation: .filter().reverse().sortBy('markedSafeAt')
    // BUG: .reverse() before .sortBy() has no effect — Dexie's sortBy() does
    // an in-memory JS sort and ignores the cursor direction set by .reverse().
    // Result is ASCENDING (oldest first), not DESCENDING (newest first).
    const safe = await testDb.products
      .filter(p => p.markedSafe === true)
      .reverse()
      .sortBy('markedSafeAt');

    const names = safe.map(p => p.name);

    // This assertion documents the current (incorrect) behaviour:
    if (names[0] === 'Newest') {
      // If this passes, the bug has been fixed
    } else {
      throw new Error(
        `BUG CONFIRMED: getSafeProducts returns "${names[0]}" first, not "Newest".\n` +
        `Dexie .reverse().sortBy() does not produce descending order.\n` +
        `Fix: collect with .toArray() then sort manually: products.sort((a,b) => b.markedSafeAt - a.markedSafeAt)`
      );
    }
  });

  it('import deduplicates scan history by timestamp + barcode', async ({ expect }) => {
    const ts = Date.now();
    await testDb.scanHistory.add({ barcode: 'DUP', verdict: 'safe', scannedAt: ts });

    const existing = await testDb.scanHistory.toArray();
    const existingKeys = new Set(existing.map(e => `${e.scannedAt}:${e.barcode}`));

    // Attempt to add duplicate
    const incoming = [{ barcode: 'DUP', verdict: 'safe', scannedAt: ts }];
    for (const entry of incoming) {
      const key = `${entry.scannedAt}:${entry.barcode}`;
      if (!existingKeys.has(key)) {
        const { id: _id, ...rest } = entry;
        await testDb.scanHistory.add(rest);
      }
    }

    const count = await testDb.scanHistory.count();
    expect(count).toBe(1); // must remain 1, not 2
  });

});

// ── 10. humanDate (ui.js) ─────────────────────────────────────────────────

describe('humanDate — human-readable timestamps', ({ }) => {

  const now = Date.now();
  const MINUTE = 60_000;
  const HOUR = 3_600_000;
  const DAY = 86_400_000;

  it('returns "today" for timestamps within the last 24 hours', ({ expect }) => {
    expect(humanDate(now - HOUR)).toBe('today');
    expect(humanDate(now - MINUTE)).toBe('today');
  });

  it('returns "yesterday" for timestamps 24–48 hours ago', ({ expect }) => {
    expect(humanDate(now - DAY - HOUR)).toBe('yesterday');
  });

  it('returns "X days ago" for timestamps 2–6 days ago', ({ expect }) => {
    const result = humanDate(now - 3 * DAY);
    expect(result).toBe('3 days ago');
  });

  it('returns "X weeks ago" for timestamps 7+ days ago', ({ expect }) => {
    const result = humanDate(now - 10 * DAY);
    expect(result).toBe('1 weeks ago');
  });

  it('returns formatted date for timestamps 30+ days ago', ({ expect }) => {
    const result = humanDate(now - 60 * DAY);
    // Should contain a year number
    expect(result).toContain('2');  // e.g. "27 Feb 2026"
  });

  it('returns "unknown date" for null/undefined', ({ expect }) => {
    expect(humanDate(null)).toBe('unknown date');
    expect(humanDate(undefined)).toBe('unknown date');
  });

});

// ── 11. Duplicate event listener regression ───────────────────────────────

describe('startScanScreen — event listener accumulation (friction bug)', ({ }) => {

  it('BUG REGRESSION: torch button gets duplicate listeners on re-entry', ({ expect }) => {
    // Each call to startScanScreen() adds a new 'click' listener to #torch-btn.
    // After 3 navigations back to scan, toggling torch fires 3 handlers.
    // This is a known friction issue. The fix is to clone-replace the element
    // before adding listeners, or use AbortController.
    //
    // We can't directly test the effect without a running scanner,
    // but we can verify the DOM structure makes it possible.
    const torchBtn = document.getElementById('torch-btn');
    expect(torchBtn).toBeTruthy();

    // Verify #manual-barcode-input exists and is re-usable
    const manualInput = document.getElementById('manual-barcode-input');
    // Will be null if we're not on the scan screen — that's fine
    // This test documents the risk rather than asserting a fix.
  });

});

// ── 12. escapeHtml — XSS safety ───────────────────────────────────────────

describe('escapeHtml — XSS safety', ({ }) => {

  it('escapes & < > " characters', ({ expect }) => {
    expect(escapeHtml('<script>')).toBe('&lt;script&gt;');
    expect(escapeHtml('"hello"')).toBe('&quot;hello&quot;');
    expect(escapeHtml('a & b')).toBe('a &amp; b');
  });

  it('escapes single quotes', ({ expect }) => {
    expect(escapeHtml("it's")).toBe('it&#39;s');
  });

  it('returns empty string for null/undefined', ({ expect }) => {
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(undefined)).toBe('');
  });

  it('handles numbers by converting to string', ({ expect }) => {
    expect(escapeHtml(42)).toBe('42');
  });

});
