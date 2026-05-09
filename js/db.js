'use strict';

// Initialise Dexie database
const db = new Dexie('foodme_db');

db.version(1).stores({
  profile:         '++id, updatedAt',
  products:        '++id, barcode, scannedAt',
  scanHistory:     '++id, barcode, productId, scannedAt',
  ingredientIndex: '++id, normalised'
});

// ── Helpers ────────────────────────────────────────────────────────────────

async function getProfile() {
  try {
    return await db.profile.get(1);
  } catch (e) {
    console.error('[foodme:db] getProfile failed', e);
    return null;
  }
}

async function saveProfile(data) {
  try {
    const existing = await db.profile.get(1);
    const now = Date.now();
    if (existing) {
      await db.profile.update(1, { ...data, updatedAt: now });
    } else {
      await db.profile.put({ id: 1, createdAt: now, updatedAt: now, ...data });
    }
    console.log('[foodme:db] profile saved');
    return true;
  } catch (e) {
    console.error('[foodme:db] saveProfile failed', e);
    return false;
  }
}

async function getProductByBarcode(barcode) {
  try {
    return await db.products.where('barcode').equals(barcode).first();
  } catch (e) {
    console.error('[foodme:db] getProductByBarcode failed', e);
    return null;
  }
}

async function saveProduct(productData) {
  try {
    const existing = productData.barcode
      ? await getProductByBarcode(productData.barcode)
      : null;

    let productId;
    if (existing) {
      // Never overwrite safe-marking fields — the user set these deliberately
      const { markedSafe: _ms, userOverride: _uo, overrideNote: _on, markedSafeAt: _msa, ...updateableData } = productData;
      await db.products.update(existing.id, {
        ...updateableData,
        scanCount: (existing.scanCount || 0) + 1,
        scannedAt: Date.now()
      });
      productId = existing.id;
      console.log('[foodme:db] product updated id=' + productId);
    } else {
      productId = await db.products.add({
        ...productData,
        scanCount: 1,
        scannedAt: Date.now()
      });
      console.log('[foodme:db] product created id=' + productId);
    }

    // Update ingredient index passively
    if (productData.ingredients && productData.ingredients.length > 0) {
      await updateIngredientIndex(productData.ingredients, productId);
    }

    return productId;
  } catch (e) {
    console.error('[foodme:db] saveProduct failed', e);
    return null;
  }
}

async function updateIngredientIndex(ingredients, productId) {
  try {
    for (const raw of ingredients) {
      const normalised = raw.toLowerCase().trim();
      if (!normalised) continue;

      const existing = await db.ingredientIndex
        .where('normalised').equals(normalised).first();

      if (existing) {
        const ids = existing.seenInProductIds || [];
        if (!ids.includes(productId)) {
          await db.ingredientIndex.update(existing.id, {
            seenInProductIds: [...ids, productId]
          });
        }
      } else {
        await db.ingredientIndex.add({
          normalised,
          raw,
          seenInProductIds: [productId]
        });
      }
    }
    console.log('[foodme:db] ingredient index updated for product ' + productId);
  } catch (e) {
    console.error('[foodme:db] updateIngredientIndex failed', e);
  }
}

async function getIngredientRecord(normalisedIngredient) {
  try {
    return await db.ingredientIndex
      .where('normalised').equals(normalisedIngredient).first();
  } catch (e) {
    console.error('[foodme:db] getIngredientRecord failed', e);
    return null;
  }
}

async function saveScanHistory(entry) {
  try {
    const id = await db.scanHistory.add({
      ...entry,
      scannedAt: Date.now()
    });
    console.log('[foodme:db] scan history entry saved id=' + id);
    return id;
  } catch (e) {
    console.error('[foodme:db] saveScanHistory failed', e);
    return null;
  }
}

async function getAllScanHistory() {
  try {
    return await db.scanHistory.orderBy('scannedAt').reverse().toArray();
  } catch (e) {
    console.error('[foodme:db] getAllScanHistory failed', e);
    return [];
  }
}

async function getSafeProducts() {
  try {
    const products = await db.products
      .filter(p => p.markedSafe === true)
      .toArray();
    // .reverse().sortBy() silently ignores reverse — sort manually for reliable descending order
    return products.sort((a, b) => (b.markedSafeAt || 0) - (a.markedSafeAt || 0));
  } catch (e) {
    console.error('[foodme:db] getSafeProducts failed', e);
    return [];
  }
}

async function getAllProducts() {
  try {
    return await db.products.toArray();
  } catch (e) {
    console.error('[foodme:db] getAllProducts failed', e);
    return [];
  }
}

async function getProductById(id) {
  try {
    return await db.products.get(id);
  } catch (e) {
    console.error('[foodme:db] getProductById failed', e);
    return null;
  }
}

async function markProductSafe(productId, override = false, overrideNote = '') {
  try {
    await db.products.update(productId, {
      markedSafe: true,
      markedSafeAt: Date.now(),
      userOverride: override,
      overrideNote: overrideNote
    });
    console.log('[foodme:db] product ' + productId + ' marked safe');
    return true;
  } catch (e) {
    console.error('[foodme:db] markProductSafe failed', e);
    return false;
  }
}

async function unmarkProductSafe(productId) {
  try {
    await db.products.update(productId, {
      markedSafe: false,
      markedSafeAt: null,
      userOverride: false,
      overrideNote: ''
    });
    console.log('[foodme:db] product ' + productId + ' unmarked safe');
    return true;
  } catch (e) {
    console.error('[foodme:db] unmarkProductSafe failed', e);
    return false;
  }
}

async function getDbCounts() {
  try {
    const [profile, products, scanHistory, ingredientIndex] = await Promise.all([
      db.profile.count(),
      db.products.count(),
      db.scanHistory.count(),
      db.ingredientIndex.count()
    ]);
    return { profile, products, scanHistory, ingredientIndex };
  } catch (e) {
    return { profile: 0, products: 0, scanHistory: 0, ingredientIndex: 0 };
  }
}

async function exportAllData() {
  try {
    const [profile, products, scanHistory, ingredientIndex] = await Promise.all([
      getProfile(),
      getAllProducts(),
      db.scanHistory.orderBy('scannedAt').reverse().limit(500).toArray(),
      db.ingredientIndex.toArray()
    ]);

    return {
      schemaVersion: 1,
      appVersion: '1.0.0',
      exportedAt: new Date().toISOString(),
      profile: profile ? { allergens: profile.allergens || [] } : { allergens: [] },
      products,
      scanHistory,
      ingredientIndex
    };
  } catch (e) {
    console.error('[foodme:db] exportAllData failed', e);
    return null;
  }
}

async function importData(data) {
  try {
    if (data.schemaVersion !== 1) {
      throw new Error('unsupported schema version: ' + data.schemaVersion);
    }

    // Replace profile entirely
    if (data.profile) {
      await saveProfile(data.profile);
    }

    // Merge products — keep local if barcode exists
    if (data.products && data.products.length > 0) {
      for (const p of data.products) {
        if (p.barcode) {
          const existing = await getProductByBarcode(p.barcode);
          if (!existing) {
            const { id: _id, ...rest } = p;
            await db.products.add(rest);
          }
        } else {
          const { id: _id, ...rest } = p;
          await db.products.add(rest);
        }
      }
    }

    // Append scan history, deduplicate by scannedAt + barcode
    if (data.scanHistory && data.scanHistory.length > 0) {
      const existing = await db.scanHistory.toArray();
      const existingKeys = new Set(existing.map(e => `${e.scannedAt}:${e.barcode}`));

      for (const entry of data.scanHistory) {
        const key = `${entry.scannedAt}:${entry.barcode}`;
        if (!existingKeys.has(key)) {
          const { id: _id, ...rest } = entry;
          await db.scanHistory.add(rest);
          existingKeys.add(key);
        }
      }
    }

    // Merge ingredient index
    if (data.ingredientIndex && data.ingredientIndex.length > 0) {
      for (const item of data.ingredientIndex) {
        const existing = await db.ingredientIndex
          .where('normalised').equals(item.normalised).first();
        if (existing) {
          const merged = [...new Set([
            ...(existing.seenInProductIds || []),
            ...(item.seenInProductIds || [])
          ])];
          await db.ingredientIndex.update(existing.id, { seenInProductIds: merged });
        } else {
          const { id: _id, ...rest } = item;
          await db.ingredientIndex.add(rest);
        }
      }
    }

    console.log('[foodme:db] import complete');
    return true;
  } catch (e) {
    console.error('[foodme:db] importData failed', e);
    throw e;
  }
}
