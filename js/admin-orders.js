/* Manual order register for a static site.
   Customer checkout DOES NOT write here: localStorage is not a shared database.
   Only an operator's manual entries are stored. No data is sent to any server. */
(async () => {
  'use strict';
  if (window.CATALOGUE_READY) await window.CATALOGUE_READY;
  if (document.body.dataset.page !== 'admin') return;
  const $ = selector => document.querySelector(selector);
  const key = 'futurefpv-manual-orders-v1';
  const statuses = ['New', 'Confirmed', 'Packed', 'Shipped', 'Delivered', 'Cancelled'];
  const payments = ['Cash on delivery', 'UPI', 'Razorpay'];
  const paymentStates = ['Unverified', 'Paid', 'Refunded'];
  const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money = n => '₹' + Number(n).toLocaleString('en-IN', {maximumFractionDigits:2});
  let orders = [];
  // Validate saved and imported data instead of trusting arbitrary JSON.
  function valid(o) {
    return o && typeof o.id === 'string' && /^FF-[A-Za-z0-9-]{1,70}$/.test(o.id) &&
      typeof o.customer === 'string' && o.customer.trim().length > 0 && o.customer.length <= 100 &&
      typeof o.phone === 'string' && /^[+0-9 ()-]{10,20}$/.test(o.phone) &&
      typeof o.address === 'string' && o.address.trim().length >= 10 && o.address.length <= 500 &&
      typeof o.items === 'string' && o.items.trim().length > 0 && o.items.length <= 2000 &&
      Number.isFinite(o.total) && o.total > 0 &&
      statuses.includes(o.status) && payments.includes(o.payment) && paymentStates.includes(o.paymentState) &&
      typeof o.createdAt === 'string' && Number.isFinite(Date.parse(o.createdAt));
  }
  try {
    const saved = JSON.parse(localStorage.getItem(key) || '[]');
    if (!Array.isArray(saved) || !saved.every(valid)) throw new Error('Invalid register');
    orders = saved;
  } catch (_) {
    $('#order-status').textContent = 'The saved register could not be read. Restore a valid backup, or check that browser storage is enabled.';
  }
  function persist(next) {
    try { localStorage.setItem(key, JSON.stringify(next)); orders = next; return true; }
    catch (_) { $('#order-status').textContent = 'Could not save. Check browser storage space and permissions. Existing orders have not been changed.'; return false; }
  }
  function render() {
    const counts = [['Total entries',orders.length],['In progress',orders.filter(o => !['Delivered','Cancelled'].includes(o.status)).length],['Delivered',orders.filter(o => o.status === 'Delivered').length]];
    $('#order-stats').innerHTML = counts.map(([label,n]) => `<div class="panel"><strong>${n}</strong><span>${label}</span></div>`).join('');
    const search = $('#order-search').value.trim().toLowerCase();
    const filter = $('#order-filter').value;
    const list = orders.filter(o => (!filter || o.status === filter) && `${o.id} ${o.customer} ${o.phone}`.toLowerCase().includes(search)).sort((a,b) => Date.parse(b.createdAt)-Date.parse(a.createdAt));
    $('#order-list').innerHTML = list.length ? list.map(o => `<article class="panel order-card"><div class="section-heading"><div><p class="eyebrow">${escape(o.id)}</p><h3>${escape(o.customer)}</h3><p class="muted">Added ${escape(new Date(o.createdAt).toLocaleString('en-IN', {timeZone:'Asia/Kolkata'}))} IST</p></div><strong>${money(o.total)}</strong></div><p><strong>Phone:</strong> ${escape(o.phone)}</p><p class="order-text"><strong>Delivery address:</strong><br>${escape(o.address)}</p><p class="order-text"><strong>Products:</strong><br>${escape(o.items)}</p><p><strong>Payment method:</strong> ${escape(o.payment)}</p><div class="order-form-grid"><label>Order status<select data-order="${escape(o.id)}" data-field="status">${statuses.map(s => `<option ${s === o.status ? 'selected' : ''}>${s}</option>`).join('')}</select></label><label>Payment status (manual)<select data-order="${escape(o.id)}" data-field="paymentState">${paymentStates.map(s => `<option ${s === o.paymentState ? 'selected' : ''}>${s}</option>`).join('')}</select></label></div><p class="muted">Verify payment independently before marking Paid. This register does not check bank, UPI or Razorpay transactions.</p><button class="remove-item" data-delete-order="${escape(o.id)}">Delete this local entry</button></article>`).join('') : `<div class="panel empty-state"><h3>${orders.length ? 'No matching orders.' : 'No orders recorded on this device.'}</h3><p>${orders.length ? 'Try a different search or status.' : 'Receive the customer’s WhatsApp message, then use “Add an order” above. Orders from other customers’ browsers cannot appear here automatically.'}</p></div>`;
  }
  $('#order-form').addEventListener('submit', e => {
    e.preventDefault(); const form = e.currentTarget;
    if (!form.reportValidity()) return;
    const data = new FormData(form);
    const suppliedId = String(data.get('orderId') || '').trim().toUpperCase();
    if (suppliedId && !/^FF-[A-Z0-9-]{1,70}$/.test(suppliedId)) { $('#order-save-status').textContent = 'Enter the FF- order ID from the WhatsApp message.'; return; }
    if (suppliedId && orders.some(o => o.id === suppliedId)) { $('#order-save-status').textContent = 'This order ID is already recorded. Find the existing entry using search.'; return; }
    const order = {id:suppliedId || 'FF-' + Date.now().toString(36).toUpperCase() + '-' + crypto.getRandomValues(new Uint32Array(1))[0].toString(36).toUpperCase(),customer:String(data.get('customer')).trim(),phone:String(data.get('phone')).trim(),address:String(data.get('address')).trim(),items:String(data.get('items')).trim(),total:Number(data.get('total')),payment:String(data.get('payment')),paymentState:'Unverified',status:'New',createdAt:new Date().toISOString()};
    if (!valid(order)) { $('#order-save-status').textContent = 'Check the customer details and enter a total greater than zero.'; return; }
    if (persist([...orders,order])) { form.reset(); $('#order-save-status').textContent = 'Order saved on this device: ' + order.id; render(); }
  });
  $('#order-search').addEventListener('input',render);
  $('#order-filter').addEventListener('change',render);
  $('#order-list').addEventListener('change',e => {
    const {order:id,field} = e.target.dataset;
    if (!id || !['status','paymentState'].includes(field)) return;
    if (!(field === 'status' ? statuses : paymentStates).includes(e.target.value)) return;
    const next = orders.map(o => o.id === id ? {...o,[field]:e.target.value} : o);
    if (persist(next)) $('#order-status').textContent = 'Order updated on this device.';
    render();
  });
  $('#order-list').addEventListener('click',e => {
    const button = e.target.closest('[data-delete-order]');
    if (!button || !confirm('Delete this order from this browser? Download a backup first if you need to keep it.')) return;
    if (persist(orders.filter(o => o.id !== button.dataset.deleteOrder))) { $('#order-status').textContent = 'Local order entry deleted.'; render(); }
  });
  $('#export-orders').addEventListener('click',() => {
    const blob = new Blob([JSON.stringify({version:1,orders},null,2)],{type:'application/json'});
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'future-fpv-orders-' + new Date().toISOString().slice(0,10) + '.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url),1000);
    $('#order-status').textContent = 'Backup prepared. Keep the downloaded customer details private.';
  });
  $('#import-orders').addEventListener('change',async e => {
    const file = e.target.files[0]; if (!file) return;
    try {
      if (file.size > 2 * 1024 * 1024) throw new Error('Backup must be smaller than 2 MB.');
      const backup = JSON.parse(await file.text());
      if (backup.version !== 1 || !Array.isArray(backup.orders) || !backup.orders.every(valid)) throw new Error('This is not a valid Future FPV order backup.');
      const byId = new Map(orders.map(o => [o.id,o]));
      const before = byId.size;
      backup.orders.forEach(o => { if (!byId.has(o.id)) { const clean = {}; ['id','customer','phone','address','items','total','payment','paymentState','status','createdAt'].forEach(k => clean[k] = o[k]); byId.set(o.id,clean); } });
      if (persist([...byId.values()])) { $('#order-status').textContent = `Restored ${byId.size - before} entries. Existing entries were preserved.`; render(); }
    } catch (error) { $('#order-status').textContent = 'Could not restore: ' + error.message; }
    e.target.value = '';
  });
  render();
})();
