/* Prices and stock can come from the read-only Apps Script feed.
   This URL is public; it must never accept edits or return customer information.
   The owner has deployed this read-only feed. Edit stock and prices in the private Sheet. */
window.CATALOGUE_CONFIG = {
  endpoint: 'https://script.google.com/macros/s/AKfycbzpv2OZjjA7cbuoEikkj6f_quiJWKyfFTyeIs3qPtlXfzR_MLOQkdEkwrCx7nes9DA/exec',
  sheetUrl: 'https://docs.google.com/spreadsheets/d/14vTExbmQ6j0hCeJB1Q88zEUmSDKMyMLfN0wixPqQD6I/edit'
};
window.CATALOGUE_READY = (async () => {
  const endpoint = window.CATALOGUE_CONFIG.endpoint;
  if (!endpoint) return; // Keep the existing published catalogue until setup is complete.
  try {
    const url = new URL(endpoint);
    if (url.protocol !== 'https:' || url.hostname !== 'script.google.com' || !/^\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(url.pathname)) throw new Error('Invalid feed URL.');
    url.searchParams.set('t', String(Date.now()));
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    let response;
    let data;
    try {
      response = await fetch(url.href, {credentials:'omit', cache:'no-store', signal:controller.signal});
      if (!response.ok) throw new Error('Feed request failed.');
      data = await response.json();
    } finally { clearTimeout(timeout); }
    const local = window.PRODUCTS || [];
    if (data.ok !== true || !Array.isArray(data.products) || data.products.length !== local.length) throw new Error('Incomplete catalogue.');
    const seen = new Set();
    for (const p of data.products) {
      if (!Number.isSafeInteger(p.id) || !local.some(item => item.id === p.id) || seen.has(p.id) || typeof p.price !== 'number' || !Number.isFinite(p.price) || p.price <= 0 || p.price > 100000000 || !Number.isSafeInteger(p.stock) || p.stock < 0) throw new Error('Invalid product values.');
      seen.add(p.id);
    }
    // Keep names, descriptions and local photos in products.js; only numbers are live.
    window.PRODUCTS = local.map(p => {
      const live = data.products.find(row => row.id === p.id);
      return {...p, price:live.price, stock:live.stock};
    });
  } catch (_) {
    // Keep product information visible, but stop purchases using stale numbers.
    window.CATALOGUE_UNAVAILABLE = true;
  }
})();
