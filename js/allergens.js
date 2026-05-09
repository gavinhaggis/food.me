'use strict';

// ── Ingredient normalisation ───────────────────────────────────────────────

function normaliseIngredient(raw) {
  if (!raw || typeof raw !== 'string') return '';

  let s = raw.toLowerCase();
  // Strip content in parentheses and square brackets (recursively)
  while (/\([^()]*\)/.test(s)) {
    s = s.replace(/\([^()]*\)/g, '');
  }
  while (/\[[^\[\]]*\]/.test(s)) {
    s = s.replace(/\[[^\[\]]*\]/g, '');
  }
  // Strip percentage values
  s = s.replace(/\d+\.?\d*\s*%/g, '');
  // Strip asterisks and footnote markers
  s = s.replace(/[*†‡§¶]/g, '');
  // Strip leading/trailing whitespace and punctuation
  s = s.trim().replace(/^[,.:;]+|[,.:;]+$/g, '').trim();

  return s;
}

function parseIngredients(rawText) {
  if (!rawText || typeof rawText !== 'string') return [];

  const results = [];

  // Recursively split on commas, handling nested brackets
  function splitRespectingBrackets(str) {
    const parts = [];
    let depth = 0;
    let current = '';

    for (const char of str) {
      if (char === '(' || char === '[') {
        depth++;
        current += char;
      } else if (char === ')' || char === ']') {
        depth--;
        current += char;
      } else if ((char === ',' || char === ';') && depth === 0) {
        parts.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    if (current.trim()) parts.push(current.trim());
    return parts;
  }

  const parts = splitRespectingBrackets(rawText);
  for (const part of parts) {
    const normalised = normaliseIngredient(part);
    if (normalised && normalised.length > 0) {
      results.push(normalised);
    }
  }

  return results;
}

// ── Confidence weight multipliers ─────────────────────────────────────────

const CONFIDENCE_WEIGHTS = {
  definite: 1.0,
  likely: 0.75,
  suspected: 0.5
};

// ── Core verdict calculation ───────────────────────────────────────────────

async function calculateVerdict(product, userProfile) {
  if (!userProfile || !userProfile.allergens || userProfile.allergens.length === 0) {
    return {
      verdict: 'safe',
      flagged: [],
      knownPercent: 0,
      unknownIngredients: product.ingredients ? product.ingredients.length : 0,
      provenanceTrail: [],
      debugSteps: {
        step1Hits: [],
        step2Hits: [],
        step3: { known: 0, unknown: 0 }
      }
    };
  }

  const flagged = [];
  const step1Hits = [];
  const step2Hits = [];

  const allergenTags = (product.allergenTags || []).map(t => t.toLowerCase());
  const ingredients = product.ingredients || [];
  const rawText = (product.rawIngredientsText || '').toLowerCase();

  // Step 1 — Hard allergen check via structured Open Food Facts tags
  for (const sensitivity of userProfile.allergens) {
    if (sensitivity.tier !== 'eu14') continue;

    const weight = CONFIDENCE_WEIGHTS[sensitivity.confidence] || 0.5;
    const key = sensitivity.key.toLowerCase();

    // OFFs tag format after stripping "en:" prefix: "milk", "gluten", etc.
    const matchingTag = allergenTags.find(tag =>
      tag === key ||
      tag.includes(key) ||
      (key === 'wheat' && tag.includes('gluten')) ||
      (key === 'tree_nuts' && tag.includes('nuts')) ||
      (key === 'shellfish' && (tag.includes('crustacean') || tag.includes('shellfish')))
    );

    if (matchingTag) {
      const hit = {
        sensitivity,
        matchType: 'structured',
        matchedValue: matchingTag,
        confidence: weight
      };
      flagged.push(hit);
      step1Hits.push(hit);
    }
  }

  // Step 2 — Keyword scan across all sensitivities
  for (const sensitivity of userProfile.allergens) {
    const weight = CONFIDENCE_WEIGHTS[sensitivity.confidence] || 0.5;
    const allKeywords = [
      ...(sensitivity.keywords || []),
      ...(sensitivity.customKeywords || [])
    ];

    // Skip if already flagged via structured tag (avoid double-counting)
    const alreadyFlagged = flagged.some(
      f => f.sensitivity.key === sensitivity.key && f.matchType === 'structured'
    );
    if (alreadyFlagged) continue;

    for (const keyword of allKeywords) {
      const kw = keyword.toLowerCase().trim();
      if (!kw) continue;

      // Check normalised ingredients array (one-directional: ingredient must contain the keyword)
      const ingredientMatch = ingredients.find(ing => ing.includes(kw));

      // Also check raw text
      const rawMatch = !ingredientMatch && rawText.includes(kw);

      if (ingredientMatch || rawMatch) {
        const hit = {
          sensitivity,
          matchType: 'keyword',
          matchedValue: ingredientMatch || kw,
          matchedKeyword: kw,
          confidence: weight * 0.9
        };
        flagged.push(hit);
        step2Hits.push(hit);
        break; // One match per sensitivity is enough
      }
    }
  }

  // Step 3 — Provenance check via ingredientIndex
  const provenanceTrail = [];
  let knownCount = 0;
  let unknownCount = 0;

  for (const ingredient of ingredients) {
    const normalised = ingredient.trim();
    if (!normalised) continue;

    let record = null;
    try {
      record = await getIngredientRecord(normalised);
    } catch (e) {
      // DB unavailable — skip provenance
    }

    const isFlagged = flagged.some(f =>
      f.matchedValue && normalised.includes(f.matchedValue.toLowerCase())
    );

    if (record && record.seenInProductIds && record.seenInProductIds.length > 0) {
      knownCount++;
      const seenInNames = await resolveProductNames(record.seenInProductIds);
      provenanceTrail.push({
        ingredient: normalised,
        status: isFlagged ? 'flagged' : 'known',
        seenIn: seenInNames
      });
    } else {
      unknownCount++;
      provenanceTrail.push({
        ingredient: normalised,
        status: isFlagged ? 'flagged' : 'unknown',
        seenIn: []
      });
    }
  }

  const total = knownCount + unknownCount;
  const knownPercent = total > 0 ? Math.round((knownCount / total) * 100) : 0;

  // Step 4 — Verdict assignment
  const highConfidenceFlag = flagged.some(f => f.confidence >= 0.75);

  let verdict;
  if (flagged.length > 0 && highConfidenceFlag) {
    verdict = 'warning';
  } else if (flagged.length > 0 || knownPercent < 50) {
    verdict = 'caution';
  } else {
    verdict = 'safe';
  }

  // Deduplicate flagged by sensitivity key
  const dedupedFlagged = [];
  const seenKeys = new Set();
  for (const f of flagged) {
    if (!seenKeys.has(f.sensitivity.key)) {
      seenKeys.add(f.sensitivity.key);
      dedupedFlagged.push(f);
    }
  }

  const confidenceScore = Math.max(0, Math.min(100,
    100 - (dedupedFlagged.length * 20) - Math.max(0, 50 - knownPercent) * 0.5
  ));

  return {
    verdict,
    flagged: dedupedFlagged,
    knownPercent,
    unknownIngredients: unknownCount,
    confidenceScore,
    provenanceTrail,
    debugSteps: {
      step1Hits,
      step2Hits,
      step3: { known: knownCount, unknown: unknownCount }
    }
  };
}

async function resolveProductNames(productIds) {
  const names = [];
  for (const id of productIds.slice(0, 3)) { // cap at 3 for UI
    try {
      const product = await getProductById(id);
      if (product && product.name) {
        names.push(product.name);
      }
    } catch (e) {
      // skip
    }
  }
  return names;
}

// ── Group suggestion logic ─────────────────────────────────────────────────

function checkForGroupSuggestions(currentSensitivityKeys, dismissedGroups = []) {
  const suggestions = [];

  for (const [groupKey, group] of Object.entries(SENSITIVITY_GROUPS)) {
    if (dismissedGroups.includes(groupKey)) continue;

    const alreadyHasGroup = currentSensitivityKeys.includes(groupKey);
    if (alreadyHasGroup) continue;

    const matches = currentSensitivityKeys.filter(k =>
      group.memberKeys.includes(k)
    );

    if (matches.length >= group.suggestThreshold) {
      suggestions.push({
        groupKey,
        group,
        matchedKeys: matches
      });
    }
  }

  return suggestions;
}

// ── Keyword expansion preview ──────────────────────────────────────────────

function getKeywordPreview(sensitivityKey, limit = 5) {
  const entry = SENSITIVITY_DICTIONARY[sensitivityKey];
  if (!entry) return [];
  return entry.keywords.slice(0, limit);
}

function fuzzyMatchSensitivities(query) {
  if (!query || query.trim().length < 2) return [];

  const q = query.toLowerCase().trim();
  const results = [];

  for (const [key, entry] of Object.entries(SENSITIVITY_DICTIONARY)) {
    const nameMatch = entry.displayName.toLowerCase().includes(q);
    const keyMatch = key.toLowerCase().includes(q);
    const keywordMatch = entry.keywords.some(kw => kw.toLowerCase().includes(q));

    if (nameMatch || keyMatch || keywordMatch) {
      results.push({
        key,
        displayName: entry.displayName,
        emoji: entry.emoji,
        tier: entry.tier,
        keywords: entry.keywords,
        score: nameMatch ? 3 : keyMatch ? 2 : 1
      });
    }
  }

  return results.sort((a, b) => b.score - a.score).slice(0, 8);
}
