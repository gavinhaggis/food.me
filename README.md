# food.me

A mobile-first PWA for scanning food barcodes and checking them against your personal allergen and sensitivity profile.

**Live app:** https://gavinhaggis.github.io/food.me/

---

## What it does

1. **Scan** a food barcode with your phone camera (or type it manually)
2. The app looks up the product on [Open Food Facts](https://world.openfoodfacts.org/)
3. It checks the ingredients against your saved allergens and sensitivities
4. You get an instant verdict — safe, caution, or warning — with the flagged ingredients highlighted
5. Scan history and a safe foods list are saved on-device

## Features

- Covers all 14 EU-regulated allergens plus common sensitivities (gluten-free grains, FODMAPs, nightshades, alliums, and more)
- Sensitivity groups — e.g. mark "alliums" once instead of listing garlic, onion, leek individually
- Manual barcode entry as a fallback when the camera is unavailable
- Fully offline after first load (service worker caches all assets)
- No account, no server, no tracking — all data stays in your browser

## Tech

- Vanilla HTML/CSS/JS — no build step, no npm
- [ZXing.js](https://github.com/zxing-js/library) for barcode decoding
- [Dexie.js](https://dexie.org/) for IndexedDB
- [Open Food Facts API](https://world.openfoodfacts.org/data) (free, open data)
- PWA — installable on Android and iOS via "Add to Home Screen"

## Running locally

Any static file server works:

```sh
npx serve .
# or
python3 -m http.server 3000
```

> **Note:** camera access requires HTTPS (or `localhost`). On a local network IP over plain HTTP the scanner will be blocked by the browser. Use the live GitHub Pages URL for mobile testing, or tunnel with `ngrok`.

## Testing

Open `test.html` in a browser. No build step required — all tests run in-page against the real app modules.

## Project structure

```
index.html                  — app shell
sw.js                       — service worker (offline support)
css/main.css                — design system and all styles
js/
  sensitivity-dictionary.js — allergen/sensitivity definitions
  db.js                     — IndexedDB via Dexie
  api.js                    — Open Food Facts fetch + normalisation
  allergens.js              — verdict calculation logic
  scanner.js                — camera + ZXing barcode scanning
  ui.js                     — all screen rendering and navigation
  app.js                    — app entry point and init
  debugger.js               — on-device debug panel (append ?debug to URL)
test-runner.js / tests.js   — browser test suite
```

## Debug mode

Add `?debug` to the URL to enable the on-device debug panel. Tap the `⌥` button above the navigation bar to open it. Useful for diagnosing camera issues on mobile without a USB connection — the panel includes device info, a live log, and a share button.

## Data & privacy

Everything is stored locally in IndexedDB. Nothing is sent to any server except the Open Food Facts API request for the scanned barcode — that request contains only the barcode number and is made directly from your device.

## License

MIT
