/* Shared order intake. This public endpoint accepts orders but never lists customers.
   No customer details are stored in localStorage or sent to GitHub. */
window.submitStoreOrder = async payload => {
  if (!window.ORDER_CAPTURE_AVAILABLE) throw new Error('Automatic order capture is not active yet.');
  const url = new URL(window.CATALOGUE_CONFIG.endpoint);
  if (url.protocol !== 'https:' || url.hostname !== 'script.google.com' || !/^\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(url.pathname)) throw new Error('Order service is not configured.');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(),25000);
  try {
    // text/plain is a simple cross-origin request supported by Apps Script web apps.
    const response = await fetch(url.href,{method:'POST',headers:{'Content-Type':'text/plain;charset=UTF-8'},credentials:'omit',cache:'no-store',signal:controller.signal,body:JSON.stringify({action:'create_order',...payload})});
    if (!response.ok) throw new Error('The order service did not respond. Retry with the same request ID.');
    const data = await response.json();
    if (!data || data.ok !== true) throw new Error(data && typeof data.message === 'string' ? data.message : 'Could not save your order. Retry with the same request ID.');
    const o=data.order;
    if (!o || typeof o.id!=='string' || !/^FF-[0-9]{8}-[A-F0-9]{24}$/.test(o.id) || !Number.isFinite(o.total) || !Number.isFinite(o.subtotal) || !Number.isFinite(o.shipping) || !Array.isArray(o.items) || !['Cash on delivery','UPI','Razorpay'].includes(o.payment)) throw new Error('Order confirmation could not be read. Retry with the same request ID.');
    return o;
  } catch (error) {
    if (error.name==='AbortError' || error instanceof TypeError) throw new Error('We could not confirm whether the order was saved. Retry with the same request ID to avoid a duplicate.');
    throw error;
  } finally {clearTimeout(timeout);}
};
