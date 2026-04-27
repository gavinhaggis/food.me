'use strict';

const OFF_API_BASE = 'https://world.openfoodfacts.org/api/v2/product/';

async function fetchFromOpenFoodFacts(barcode) {
  const url = `${OFF_API_BASE}${encodeURIComponent(barcode)}.json`;
  console.log('[foodme:api] fetching', url);

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'food.me/1.0.0 (https://github.com/foodme)'
      }
    });

    if (!response.ok) {
      console.warn('[foodme:api] HTTP error', response.status);
      return { found: false, error: 'network', httpStatus: response.status };
    }

    const data = await response.json();

    if (data.status !== 1 || !data.product) {
      console.log('[foodme:api] product not found for', barcode);
      return { found: false, error: 'not_found', rawResponse: data };
    }

    const p = data.product;

    // Normalise ingredients from ingredients_text or ingredients array
    const rawIngredientsText = p.ingredients_text || p.ingredients_text_en || '';
    const ingredients = parseIngredients(rawIngredientsText);

    // Also parse structured ingredients if available
    if (p.ingredients && Array.isArray(p.ingredients)) {
      const structuredIngredients = p.ingredients
        .map(i => normaliseIngredient(i.text || i.id || ''))
        .filter(Boolean);

      // Merge, preferring structured
      for (const si of structuredIngredients) {
        if (!ingredients.includes(si)) {
          ingredients.push(si);
        }
      }
    }

    // Strip "en:" prefix from allergen tags
    const allergenTags = [
      ...(p.allergens_tags || []),
      ...(p.allergens_hierarchy || [])
    ]
      .map(tag => tag.replace(/^en:/, '').toLowerCase())
      .filter((tag, idx, arr) => arr.indexOf(tag) === idx); // deduplicate

    const imageUrl = p.image_front_url ||
      p.image_url ||
      p.image_front_small_url ||
      '';

    const result = {
      found: true,
      name: p.product_name || p.product_name_en || 'Unknown product',
      brand: p.brands || '',
      ingredients,
      rawIngredientsText,
      allergenTags,
      imageUrl,
      rawResponse: data
    };

    console.log('[foodme:api] found product:', result.name, '— ingredients:', ingredients.length);
    return result;

  } catch (e) {
    console.error('[foodme:api] fetch failed', e);
    return { found: false, error: 'network', message: e.message };
  }
}
