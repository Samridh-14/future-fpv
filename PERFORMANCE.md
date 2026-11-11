# Performance changes

## Main finding

The public Google Apps Script catalogue took 2.886–4.71 seconds across three requests from the development environment. These are server-side network observations, not mobile Lighthouse or browser FCP scores. main.js previously awaited that request before creating the navigation, footer or event handlers.

## Changes

- Render the shared navigation/footer and wire the mobile menu and WhatsApp button before awaiting Sheets. Product image/name previews appear while prices and availability are checked; unverified prices are not used to enable purchases.
- Do not load the catalogue script on About or Contact. They work independently of Google Sheets availability.
- Cache only the validated PUBLIC catalogue in sessionStorage for 30 seconds. Same-tab navigation can reuse it without another network request. Reload bypasses the cache. Older browsers without navigation timing conservatively fetch fresh values. A successful saved order invalidates the cache. Customer details are never stored in it.
- The server still recalculates checkout totals, checks stock and handles automatic deduction. Cache expiry, malformed values or failed fresh requests do not fall back to stale purchase data.
- Replace the external Google Fonts stylesheet with local Latin WOFF2 files, font-display: swap and preloads for body/headline fonts. Keep brand weight 800 and heading weight 700; stop requesting unused heading weight 600. Font licences are in fonts/.
- Keep SVG illustrations: all eight product images together are 8378 bytes, and the largest is 1260 bytes. Raster conversion would add weight. Add dimensions/async decoding to the home hero and prioritise hero/product images. The shop's first mobile row loads eagerly; lower images stay lazy.
- Remove the obsolete public Admin-button CSS. Retain the compact shared mobile, checkout and admin rules: these are used by different pages and dynamically generated content. A separate CSS pipeline/minifier is unnecessary. The local stylesheet grows slightly because it now includes the font-face declarations instead of fetching a separate remote stylesheet.
- Load orders-api.js only on Cart. All scripts remain deferred; no framework, build tools or npm are needed.

## Validation

Functional checks cover: shell/menu/WhatsApp before a deliberately unresolved catalogue; cache hit, expiry, reload, invalidation and storage restrictions; invalid feed/failure handling; order references; all payment methods; local admin tools; and backend inventory concurrency/idempotency/cancellation handling. Local asset links, image dimensions, font paths, page-specific scripts and JavaScript syntax were checked.

A rendered browser/Lighthouse run was unavailable because the required managed browser tool is not present in this environment. No mobile performance score or exact first-paint improvement is claimed. Fresh catalogue reads can still take several seconds because they depend on Google Apps Script. Navigation no longer waits for them, and ordinary repeat browsing avoids unnecessary calls.

## Hosting

Pushes update the repository. GitHub Pages has recently failed before starting build jobs (startup_failure); this is separate from the source-level optimisations. Do not claim the GitHub Pages copy has the new code until its deployment or live files are verified. The separate hosted Site can publish the same static files independently.
