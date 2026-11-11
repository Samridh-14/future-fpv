/* Public prices/stock only. A short per-tab cache speeds up page-to-page browsing.
   Reload always fetches fresh Sheet values. Checkout independently validates stock
   and prices on the server, and saving an order invalidates this cache. */
window.CATALOGUE_CONFIG = {
  endpoint: 'https://script.google.com/macros/s/AKfycbzpv2OZjjA7cbuoEikkj6f_quiJWKyfFTyeIs3qPtlXfzR_MLOQkdEkwrCx7nes9DA/exec',
  sheetUrl: 'https://docs.google.com/spreadsheets/d/14vTExbmQ6j0hCeJB1Q88zEUmSDKMyMLfN0wixPqQD6I/edit'
};
const catalogueCacheKey = 'futurefpv-public-catalogue-v1';
window.invalidateCatalogueCache = () => { try { sessionStorage.removeItem(catalogueCacheKey); } catch (_) {} };
window.CATALOGUE_READY = (async () => {
  const endpoint = window.CATALOGUE_CONFIG.endpoint;
  if (!endpoint) return;
  const local = window.PRODUCTS || [];
  function valid(data) {
    if (!data || data.ok !== true || !Array.isArray(data.products) || data.products.length !== local.length) return false;
    const seen = new Set();
    return data.products.every(p => {
      if (!p || !Number.isSafeInteger(p.id) || !local.some(item => item.id === p.id) || seen.has(p.id) || typeof p.price !== 'number' || !Number.isFinite(p.price) || p.price <= 0 || p.price > 100000000 || !Number.isSafeInteger(p.stock) || p.stock < 0) return false;
      seen.add(p.id); return true;
    });
  }
  function apply(data) {
    window.ORDER_CAPTURE_AVAILABLE = data.orderCapture === 1;
    window.STOCK_AUTOMATION_AVAILABLE = data.stockAutomation === 1;
    window.PRODUCTS = local.map(p => {
      const live = data.products.find(row => row.id === p.id);
      return {...p, price:live.price, stock:live.stock};
    });
  }
  try {
    const navigation = window.performance && window.performance.getEntriesByType('navigation')[0];
    const reload = !navigation || navigation.type === 'reload';
    const cached = JSON.parse(sessionStorage.getItem(catalogueCacheKey) || 'null');
    const age = cached ? Date.now() - cached.savedAt : Infinity;
    if (!reload && cached && cached.endpoint === endpoint && age >= 0 && age < 30000 && valid(cached.data)) {
      apply(cached.data); window.CATALOGUE_CACHE_HIT = true; return;
    }
  } catch (_) { /* Private browsing/storage restrictions must not stop live reads. */ }
  try {
    const url = new URL(endpoint);
    if (url.protocol !== 'https:' || url.hostname !== 'script.google.com' || !/^\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(url.pathname)) throw new Error('Invalid feed URL.');
    url.searchParams.set('t', String(Date.now()));
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(),10000);
    let data;
    try {
      const response = await fetch(url.href,{credentials:'omit',cache:'no-store',signal:controller.signal});
      if (!response.ok) throw new Error('Feed request failed.');
      data = await response.json();
    } finally {clearTimeout(timeout);}
    if (!valid(data)) throw new Error('Invalid catalogue.');
    apply(data);
    try {sessionStorage.setItem(catalogueCacheKey,JSON.stringify({endpoint,savedAt:Date.now(),data}));} catch (_) {}
  } catch (_) {
    window.invalidateCatalogueCache();
    // No stale-cache fallback: purchases stay blocked if live data cannot be read.
    window.CATALOGUE_UNAVAILABLE = true;
  }
})();
