/* FUTURE FPV SETTINGS — edit these before launch. Use public information only.
   Never put a Razorpay secret key or other private credentials in this file.
   A Razorpay hosted Payment Link can be shared after the order total is confirmed. */
const STORE = {
  whatsapp: '919310522469', // Example format: 919876543210 (country code, digits only)
  phone: '', // Example: +919876543210
  email: '',
  upiId: '',
  upiQrImage: '', // Path to YOUR real QR image, for example images/upi-qr.png
  razorpayPaymentLink: '', // A valid https://rzp.io/ or https://razorpay.com/ hosted link
  shipping: 35
};

(async () => {
  'use strict';
  const $ = (selector) => document.querySelector(selector);
  const money = n => '₹' + Number(n).toLocaleString('en-IN');
  // Escape user-editable text before inserting it in HTML.
  const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function read(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch (_) { return fallback; } }
  function save(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch (_) { toast('Browser storage is unavailable. Your changes may not survive refresh.'); return false; } }
  // Public catalogue comes from products.js. Admin overrides affect only the admin editor.
  let products = window.PRODUCTS || [];
  const getProduct = id => products.find(p => p.id === Number(id));
  let cart = read('futurefpv-cart-v1', []);
  if (!Array.isArray(cart)) cart = [];
  cart = cart.filter(row => row && getProduct(row.id) && Number.isInteger(row.qty) && row.qty > 0).map(row => ({id:Number(row.id),qty:row.qty}));
  const page = document.body.dataset.page;
  let toastTimer;
  function toast(message) { const el = $('#toast'); el.textContent = message; el.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), 4500); }
  function countCart() { const badge = $('.cart-count'); if (badge) badge.textContent = cart.reduce((sum,row) => sum + row.qty, 0); }
  function storeCart() { save('futurefpv-cart-v1', cart); countCart(); }
  function subtotal() { return cart.reduce((sum,row) => sum + getProduct(row.id).price * row.qty, 0); }
  function addToCart(id, qty = 1) {
    if (window.CATALOGUE_UNAVAILABLE) return toast('Live prices and stock are unavailable. Please refresh or contact the store.');
    const p = getProduct(id); if (!p || p.stock < 1) return toast('This product is out of stock.');
    qty = Math.max(1, Math.floor(Number(qty) || 1));
    const row = cart.find(r => r.id === p.id);
    const oldQty = row ? row.qty : 0;
    if (oldQty + qty > p.stock) return toast('Only ' + p.stock + ' available. Check the quantity in your cart.');
    if (row) row.qty += qty; else cart.push({id:p.id, qty});
    storeCart(); toast(p.name + ' added to your cart.');
  }
  function whatsappUrl(message) { return /^\d{10,15}$/.test(STORE.whatsapp) ? 'https://wa.me/' + STORE.whatsapp + '?text=' + encodeURIComponent(message) : ''; }
  function openWhatsApp(message, status) {
    const url = whatsappUrl(message);
    if (!url) { const text = 'WhatsApp is not set up yet. The store owner must add the business number in js/main.js before messages or orders can be sent.'; if (status) status.textContent = text; toast(text); return false; }
    // A real user gesture opens WhatsApp, with no hidden form submission or data storage.
    window.open(url, '_blank', 'noopener,noreferrer'); return true;
  }
  const nav = [['index','Home'],['shop','Shop'],['about','Our story'],['contact','Contact']];
  $('#site-header').innerHTML = `<div class="announcement">MORE AIRTIME. LESS GUESSWORK. &nbsp; / &nbsp; ₹35 SHIPPING ACROSS INDIA</div><header><nav class="site-nav" aria-label="Main navigation"><a class="brand" href="index.html" aria-label="Future FPV home"><span class="brand-mark">✣</span> FUTURE <b>FPV</b></a><div class="nav-links" id="nav-links">${nav.map(([file,label]) => `<a href="${file}.html" ${page === file ? 'aria-current="page"' : ''}>${label}</a>`).join('')}</div><div class="nav-actions"><a class="cart-link" href="cart.html" aria-label="View shopping cart">Cart <span class="cart-count">0</span></a><button class="menu-toggle" aria-expanded="false" aria-controls="nav-links" aria-label="Toggle navigation">☰</button></div></nav></header><div class="demo-notice">PRE-LAUNCH PREVIEW · Sample products & illustrations · Payment setup pending</div>`;
  $('#site-footer').innerHTML = `<footer class="site-footer"><div class="footer-inner"><div class="footer-grid"><div><a class="brand" href="index.html">FUTURE <b>FPV</b></a><p>For the builders. For the flyers.<br>Your next flight starts here.</p></div><div><h3>Explore</h3><div class="footer-links"><a href="shop.html">Shop all parts</a><a href="about.html">Our story</a><a href="contact.html">Get in touch</a></div></div><div><h3>Flight support</h3><div class="footer-links"><a href="index.html#guide">Beginner's guide</a><a href="index.html#main">Shipping: ₹35 across India</a><a href="contact.html">Compatibility advice</a></div></div><div><h3>Good to know</h3><p>Payment and delivery are confirmed when your order request is reviewed.</p></div></div><div class="footer-bottom">© ${new Date().getFullYear()} Future FPV · Built for the love of flight.</div></div></footer>`;
  countCart();
  $('.menu-toggle').addEventListener('click', e => { const open = e.currentTarget.getAttribute('aria-expanded') !== 'true'; e.currentTarget.setAttribute('aria-expanded', String(open)); $('#nav-links').classList.toggle('open', open); });
  $('#whatsapp-float').addEventListener('click', () => openWhatsApp('Hi Future FPV! I need help with my next build.'));
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { $('#nav-links').classList.remove('open'); $('.menu-toggle').setAttribute('aria-expanded','false'); } });
  // Paint the page shell and product previews BEFORE waiting for Google Sheets.
  // No prices or purchase actions are shown from an unverified initial snapshot.
  function previewCard(p,index) {
    return `<article class="product-card" aria-busy="true"><a class="product-visual" href="product.html?id=${p.id}" style="display:block"><img src="${p.image}" alt="${esc(p.alt)}" width="440" height="360" decoding="async" loading="${page === 'shop' && index < 2 ? 'eager' : 'lazy'}"></a><p class="product-category">${esc(p.category)}</p><h3><a href="product.html?id=${p.id}">${esc(p.name)}</a></h3><div class="product-bottom"><span class="muted">Checking live price…</span><button class="quick-add" disabled>Loading…</button></div></article>`;
  }
  if (window.CATALOGUE_READY) {
    if ($('#featured-products')) $('#featured-products').innerHTML = products.slice(0,4).map(previewCard).join('');
    if (page === 'shop') { $('#shop-products').innerHTML = products.map(previewCard).join(''); $('#result-count').textContent = 'Checking live prices and stock…'; }
    if (page === 'product') {
      const preview = getProduct(new URLSearchParams(location.search).get('id'));
      if (preview) $('#product-detail').innerHTML = `<div class="product-detail-grid" aria-busy="true"><img class="product-photo" src="${preview.image}" alt="${esc(preview.alt)}" width="440" height="360" fetchpriority="high" decoding="async"><div class="product-info"><p class="eyebrow">${esc(preview.category)}</p><h1>${esc(preview.name)}</h1><p>${esc(preview.description)}</p><p class="muted">Checking live prices and stock…</p></div></div>`;
    }
    if (page === 'cart') $('#cart-content').innerHTML = '<p class="panel" aria-busy="true">Checking your cart against live prices and stock…</p>';
    await window.CATALOGUE_READY;
    products = window.PRODUCTS || products;
  }
  if (['index','shop','product','cart','admin'].includes(page)) {
    cart = cart.filter(row => getProduct(row.id)).map(row => ({id:row.id,qty:Math.min(row.qty,getProduct(row.id).stock)})).filter(row => row.qty > 0);
    countCart();
  }
  if (window.CATALOGUE_UNAVAILABLE) {
    const warning = document.createElement('div');
    warning.className = 'notice'; warning.setAttribute('role','alert');
    warning.textContent = 'Live prices and stock could not be loaded. Displayed numbers may be outdated. Ordering is temporarily unavailable; refresh this page or contact us on WhatsApp.';
    $('#main').prepend(warning);
  }
  function card(p,index = 0) { return `<article class="product-card"><a class="product-visual" href="product.html?id=${p.id}" style="display:block"><img src="${p.image}" alt="${esc(p.alt)}" width="440" height="360" decoding="async" loading="${page === 'shop' && index < 2 ? 'eager' : 'lazy'}">${p.stock < 1 ? '<span class="stock-label">OUT OF STOCK</span>' : ''}</a><p class="product-category">${esc(p.category)}</p><h3><a href="product.html?id=${p.id}">${esc(p.name)}</a></h3><div class="product-bottom"><span class="price">${money(p.price)}</span><button class="quick-add" data-add="${p.id}" aria-label="Add ${esc(p.name)} to cart" ${!p.stock || window.CATALOGUE_UNAVAILABLE ? 'disabled' : ''}>${p.stock ? 'Add +' : 'Sold out'}</button></div></article>`; }
  document.addEventListener('click', e => { const button = e.target.closest('[data-add]'); if (button) addToCart(Number(button.dataset.add)); });
  if ($('#featured-products')) $('#featured-products').innerHTML = products.slice(0,4).map(card).join('');
  if (page === 'shop') {
    const requested = new URLSearchParams(location.search).get('category');
    if ([...$('#category').options].some(o => o.value === requested)) $('#category').value = requested;
    function renderShop() { let list = products.filter(p => (!$('#category').value || p.category === $('#category').value) && (p.name + ' ' + p.category).toLowerCase().includes($('#search').value.trim().toLowerCase())); if ($('#sort').value !== 'featured') list.sort((a,b) => $('#sort').value === 'low' ? a.price - b.price : b.price - a.price); $('#shop-products').innerHTML = list.length ? list.map(card).join('') : '<p class="empty-state">No matching products. Try another search or category.</p>'; $('#result-count').textContent = list.length + ' products · sample catalogue'; }
    ['#search','#category','#sort'].forEach(id => $(id).addEventListener('input', renderShop)); renderShop();
  }
  if (page === 'product') {
    const p = getProduct(new URLSearchParams(location.search).get('id'));
    if (!p) $('#product-detail').innerHTML = '<h1>Product not found.</h1><p>This product link may be incorrect.</p><a class="button" href="shop.html">Back to shop</a>';
    else {
      document.title = p.name + ' | Future FPV';
      document.querySelector('meta[name="description"]').content = p.description;
      document.querySelector('meta[property="og:title"]').content = document.title;
      document.querySelector('meta[property="og:description"]').content = p.description;
      document.querySelector('meta[property="og:image"]').content = p.image;
      $('#product-detail').innerHTML = `<p class="breadcrumbs"><a href="shop.html">Shop</a> / ${esc(p.category)}</p><div class="product-detail-grid"><img class="product-photo" src="${p.image}" alt="${esc(p.alt)}" width="440" height="360" fetchpriority="high" decoding="async"><div class="product-info"><p class="eyebrow">${esc(p.category)}</p><h1>${esc(p.name)}</h1><span class="price">${money(p.price)}</span><p class="product-description">${esc(p.description)}</p><p>${p.stock > 0 ? p.stock + ' available in sample stock' : 'Out of stock'}</p><div class="purchase-row"><div class="quantity-control"><button type="button" id="qty-down" aria-label="Decrease quantity">−</button><input id="product-qty" type="number" min="1" max="${Math.max(1,p.stock)}" value="1" aria-label="Product quantity"><button type="button" id="qty-up" aria-label="Increase quantity">+</button></div><button class="button" id="product-add" ${p.stock && !window.CATALOGUE_UNAVAILABLE ? '' : 'disabled'}>Add to cart ↗</button></div><p class="muted">₹35 flat delivery across India · Sample listing</p><details open><summary>Compatibility & specifications</summary><p>${esc(p.compatibility)}</p><p class="muted">Sample specifications. Confirm the real product and your complete build before purchasing.</p></details><details><summary>Shipping & returns</summary><p>Delivery is ₹35 per order. Serviceability, dispatch timing and return terms must be confirmed with the store before payment.</p></details><p><a class="text-link" href="contact.html">Not sure it fits? Ask us →</a></p></div></div>`;
      const qty = $('#product-qty');
      const clampQty = () => qty.value = Math.max(1, Math.min(p.stock || 1, Math.floor(Number(qty.value) || 1)));
      $('#qty-down').onclick = () => { qty.value = Number(qty.value) - 1; clampQty(); };
      $('#qty-up').onclick = () => { qty.value = Number(qty.value) + 1; clampQty(); };
      qty.onchange = clampQty;
      $('#product-add').onclick = () => { clampQty(); addToCart(p.id, qty.value); };
    }
  }
  if (page === 'cart') {
    function renderCart() {
      $('#checkout-area').hidden = !cart.length;
      if (!cart.length) { $('#cart-content').innerHTML = '<div class="empty-state"><h2>Room for your next build.</h2><p>Your cart is empty. Find a part to get started.</p><a class="button" href="shop.html">Explore the shop ↗</a></div>'; return; }
      $('#cart-content').innerHTML = cart.map(row => { const p = getProduct(row.id); return `<article class="cart-row"><a href="product.html?id=${p.id}"><img src="${p.image}" alt="${esc(p.alt)}" width="100" height="82"></a><div><h3><a href="product.html?id=${p.id}">${esc(p.name)}</a></h3><span>${money(p.price)} each · <strong>${money(p.price * row.qty)}</strong></span><div class="cart-row-actions"><div class="quantity-control"><button data-change="${p.id}" data-delta="-1" aria-label="Decrease ${esc(p.name)} quantity">−</button><input type="number" min="1" max="${p.stock}" value="${row.qty}" data-quantity="${p.id}" aria-label="Quantity for ${esc(p.name)}"><button data-change="${p.id}" data-delta="1" aria-label="Increase ${esc(p.name)} quantity">+</button></div><button class="remove-item" data-remove="${p.id}">Remove</button></div></div></article>`; }).join('') + `<div class="cart-summary"><div class="summary-line"><span>Subtotal</span><span>${money(subtotal())}</span></div><div class="summary-line"><span>Shipping</span><span>${money(STORE.shipping)}</span></div><div class="summary-line total"><span>Total</span><span>${money(subtotal() + STORE.shipping)}</span></div><p class="muted">Final invoice details will be confirmed by the store.</p><a class="text-link" href="#checkout-form">Continue to delivery details ↓</a></div>`;
    }
    function updateQty(id, qty) { const row = cart.find(r => r.id === id); const p = getProduct(id); if (!row || !p) return; row.qty = Math.max(1,Math.min(p.stock,Math.floor(Number(qty) || 1))); storeCart(); renderCart(); }
    $('#cart-content').addEventListener('click', e => { const remove = e.target.closest('[data-remove]'); const change = e.target.closest('[data-change]'); if (remove) { cart = cart.filter(r => r.id !== Number(remove.dataset.remove)); storeCart(); renderCart(); } if (change) { const id = Number(change.dataset.change); updateQty(id, cart.find(r => r.id === id).qty + Number(change.dataset.delta)); } });
    $('#cart-content').addEventListener('change', e => { if (e.target.matches('[data-quantity]')) updateQty(Number(e.target.dataset.quantity), e.target.value); });
    function paymentInfo() {
      const payment = $('#payment').value; const box = $('#payment-info');
      if (window.ORDER_CAPTURE_AVAILABLE) { box.textContent = payment === 'Cash on delivery' ? 'Your order is saved first. Pay on delivery after the store confirms availability.' : 'Place your order first to receive an order ID. Payment instructions appear after the order is saved. Payment is verified separately by the store.'; return; }
      if (payment === 'Cash on delivery') box.textContent = 'Pay on delivery after the store confirms COD availability for your address.';
      if (payment === 'UPI') { box.innerHTML = `<strong>UPI payment</strong><p>UPI ID: ${STORE.upiId ? esc(STORE.upiId) : 'YOUR_UPI_ID — not configured'}</p>${STORE.upiQrImage ? `<img src="${esc(STORE.upiQrImage)}" width="160" height="160" alt="Future FPV UPI payment QR code">` : '<div class="qr-placeholder">Your real UPI QR code goes here</div>'}<p>Wait for order confirmation before paying. This site does not verify UPI payments.</p>`; }
      if (payment === 'Razorpay') { let valid = false; try { const u = new URL(STORE.razorpayPaymentLink); valid = u.protocol === 'https:' && ['rzp.io','razorpay.com','pages.razorpay.com'].includes(u.hostname); } catch (_) {} box.innerHTML = '<strong>Razorpay · UPI, cards & net banking</strong><p>' + (valid ? 'A hosted payment link is available. Confirm the exact amount with the store before paying.' : 'Razorpay is not configured yet. The store can send a secure payment link after confirming your order.') + '</p>' + (valid ? `<a class="text-link" target="_blank" rel="noopener noreferrer" href="${esc(STORE.razorpayPaymentLink)}">Open Razorpay payment link ↗</a>` : ''); }
    }
    if (window.ORDER_CAPTURE_AVAILABLE) {
      $('#place-order').textContent = 'Place order ↗';
      $('#checkout-instructions').textContent = 'Place your order to save your delivery details securely with the store and receive an order ID. This works for COD, UPI and Razorpay. The store confirms stock, delivery and payment separately.';
      $('#checkout-next-steps').innerHTML = '<li>Check your products and delivery details.</li><li>Place the order and keep your order ID.</li><li>Follow the payment instructions or contact the store on WhatsApp.</li>';
    }
    $('#payment').addEventListener('change', paymentInfo); paymentInfo(); renderCart();
    // Persist only a random reference and cart signature, never delivery details.
    let requestReference = read('futurefpv-order-reference-v1', null);
    if (!requestReference || !/^FF-[0-9]{8}-[A-F0-9]{24}$/.test(requestReference.id) || typeof requestReference.signature !== 'string') requestReference = null;
    function showReference() {
      const visibleId = requestReference ? (window.ORDER_CAPTURE_AVAILABLE ? requestReference.confirmedId : requestReference.id) : '';
      $('#order-reference').hidden = !visibleId;
      $('#order-reference-value').textContent = visibleId || '';
    }
    function orderId() {
      const signature = JSON.stringify({items:cart.map(row => [row.id,row.qty,getProduct(row.id).price]),shipping:STORE.shipping});
      if (!requestReference || requestReference.signature !== signature) {
        const date = new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()).replace(/-/g,'');
        const bytes = crypto.getRandomValues(new Uint8Array(12));
        const random = Array.from(bytes,byte => byte.toString(16).padStart(2,'0')).join('').toUpperCase();
        requestReference = {id:'FF-' + date + '-' + random,signature};
        save('futurefpv-order-reference-v1',requestReference);
      }
      showReference(); return requestReference.id;
    }
    $('#new-order-reference').addEventListener('click',() => {
      requestReference = null;
      save('futurefpv-order-reference-v1',null);
      showReference();
      if ($('#saved-order-actions')) $('#saved-order-actions').hidden = true;
      $('#checkout-status').textContent = 'Your next checkout request will receive a new order ID.';
    });
    showReference();
    function savedPayment(order) {
      const box = $('#saved-order-payment');
      if (order.payment === 'Cash on delivery') { box.textContent = 'Order saved. Payment is due on delivery after the store confirms your order. No online payment was collected.'; return; }
      if (order.payment === 'UPI') { box.innerHTML = `<strong>Order saved · UPI payment</strong><p>UPI ID: ${STORE.upiId ? esc(STORE.upiId) : 'Not configured yet — contact the store for payment instructions.'}</p>${STORE.upiQrImage ? `<img src="${esc(STORE.upiQrImage)}" width="160" height="160" alt="Future FPV UPI payment QR code">` : ''}<p>Amount: ${money(order.total)}. Quote order ID ${esc(order.id)}. Wait for stock confirmation before paying. Payment remains unverified until the store checks receipt.</p>`; return; }
      let link = '';
      try { const u = new URL(STORE.razorpayPaymentLink); if (u.protocol === 'https:' && ['rzp.io','razorpay.com','pages.razorpay.com'].includes(u.hostname)) link = u.href; } catch (_) {}
      box.innerHTML = `<strong>Order saved · Razorpay payment</strong><p>Order ID: ${esc(order.id)} · Amount: ${money(order.total)}.</p><p>${link ? 'Confirm stock and the exact payment-link amount with the store before paying.' : 'The store will send a secure payment link after confirming stock. Razorpay is not connected for automatic payment collection.'}</p>${link ? `<a class="text-link" href="${esc(link)}" target="_blank" rel="noopener noreferrer">Continue to Razorpay ↗</a>` : ''}<p>Payment remains unverified until the store checks receipt.</p>`;
    }
    $('#checkout-form').addEventListener('submit', async e => {
      e.preventDefault(); if (!cart.length) return;
      const form = e.currentTarget; if (!form.reportValidity()) return;
      if (window.CATALOGUE_UNAVAILABLE) { $('#checkout-status').textContent = 'Live prices and stock are unavailable. Refresh or contact the store before ordering.'; return; }
      const data = new FormData(form);
      const reference = orderId();
      let receipt;
      const button = $('#place-order');
      if (window.ORDER_CAPTURE_AVAILABLE) {
        if (button.disabled) return;
        button.disabled = true;
        $('#new-order-reference').disabled = true;
        $('#saved-order-actions').hidden = true;
        $('#checkout-status').textContent = 'Saving your order securely. Please wait…';
        try {
          receipt = await window.submitStoreOrder({requestKey:reference,customer:String(data.get('name')).trim(),phone:String(data.get('phone')).trim(),address:String(data.get('address')).trim(),pincode:String(data.get('pincode')).trim(),payment:String(data.get('payment')),items:cart.map(row=>({id:row.id,qty:row.qty})),expectedTotal:Math.round((subtotal()+STORE.shipping)*100)/100,consent:true});
          if (window.invalidateCatalogueCache) window.invalidateCatalogueCache();
          requestReference.confirmedId = receipt.id;
          save('futurefpv-order-reference-v1', requestReference);
          showReference();
          $('#order-reference-note').textContent = 'Your order request is saved with the store. Keep this ID for follow-up. Payment remains unverified until the store checks receipt.';
          $('#checkout-status').textContent = 'Order saved! Your order ID is ' + receipt.id + '. Total: ' + money(receipt.total) + '. Payment preference: ' + receipt.payment + '. No payment has been confirmed.';
          savedPayment(receipt);
        } catch (error) {
          $('#checkout-status').textContent = error.message || 'Could not confirm your order. Please retry with the same request ID.';
          return;
        } finally { button.disabled = false; $('#new-order-reference').disabled = false; }
      } else {
        // Keep the existing WhatsApp flow until the owner deploys order capture.
        if (!whatsappUrl('')) { openWhatsApp('', $('#checkout-status')); return; }
        receipt = {id:reference,items:cart.map(row=>({...getProduct(row.id),qty:row.qty})),subtotal:subtotal(),shipping:STORE.shipping,total:subtotal()+STORE.shipping,payment:String(data.get('payment'))};
      }
      const lines = receipt.items.map(item => `${item.name} × ${item.qty} — ${money(item.price*item.qty)}`);
      const message = ['Hello Future FPV! I would like to follow up on my order request:', `Order ID: ${receipt.id}`, '', ...lines, '', `Subtotal: ${money(receipt.subtotal)}`, `Shipping: ${money(receipt.shipping)}`, `Total: ${money(receipt.total)}`, '', `Name: ${String(data.get('name')).trim()}`, `Phone: ${data.get('phone')}`, `Address: ${String(data.get('address')).trim()}`, `PIN: ${data.get('pincode')}`, `Payment preference: ${receipt.payment}`, '', 'Please confirm stock, delivery, return terms and payment instructions.'].join('\n');
      if (window.ORDER_CAPTURE_AVAILABLE) {
        const url = whatsappUrl(message);
        $('#saved-order-whatsapp').hidden = !url;
        if (url) $('#saved-order-whatsapp').href = url;
        $('#saved-order-actions').hidden = false;
      } else if (openWhatsApp(message, $('#checkout-status'))) {
        $('#checkout-status').textContent = 'Order ID: ' + reference + '. WhatsApp opened with your order request. Press Send there and keep this ID for follow-up. The store will confirm your order.';
      }
    });
  }
  if (page === 'contact') {
    $('#contact-methods').innerHTML = `<h2>Talk to Future FPV</h2><div class="contact-option"><strong>WhatsApp</strong><br>${STORE.whatsapp ? `<button class="button secondary" id="contact-wa">Start a conversation ↗</button>` : '<p>Business WhatsApp number coming soon.</p>'}</div><div class="contact-option"><strong>Phone</strong><br>${/^\+?\d{10,15}$/.test(STORE.phone) ? `<a href="tel:${esc(STORE.phone)}">${esc(STORE.phone)}</a>` : '<p>Phone number coming soon.</p>'}</div><div class="contact-option"><strong>Email</strong><br>${/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(STORE.email) ? `<a href="mailto:${esc(STORE.email)}">${esc(STORE.email)}</a>` : '<p>Email address coming soon.</p>'}</div><p>Delivery across India · ₹35 per order</p>`;
    if ($('#contact-wa')) $('#contact-wa').onclick = () => openWhatsApp('Hello Future FPV!');
    $('#contact-form').onsubmit = e => { e.preventDefault(); const data = new FormData(e.currentTarget); openWhatsApp(`Hello Future FPV!\nName: ${data.get('name')}\nEmail: ${data.get('email')}\n\n${data.get('message')}`, $('#contact-status')); };
  }
  if (page === 'admin') {
    if (window.ORDER_CAPTURE_AVAILABLE && $('#private-orders-link')) {
      $('#private-orders-link').href = window.CATALOGUE_CONFIG.endpoint + '?page=admin';
      $('#private-orders-link').hidden = false;
      $('#private-orders-status').textContent = 'Automatic order capture is active for COD, UPI and Razorpay. ' + (window.STOCK_AUTOMATION_AVAILABLE ? 'Stock deduction is active. Cancelling an unshipped order restores stock once. ' : 'Automatic stock deduction is awaiting the updated Google script deployment. ') + 'Open the private dashboard while signed in to the Google account that owns the Orders Sheet.';
    }
    let edits = read('futurefpv-admin-v1', products.map(p => ({...p})));
    if (!Array.isArray(edits) || edits.length !== products.length) edits = products.map(p => ({...p}));
    function renderAdmin() { $('#admin-products').innerHTML = edits.map(p => `<div class="admin-row"><label>Product name<input data-id="${p.id}" data-field="name" value="${esc(p.name)}" maxlength="120"></label><label>Price (₹)<input type="number" min="1" step="1" data-id="${p.id}" data-field="price" value="${p.price}"></label><label>Stock<input type="number" min="0" step="1" data-id="${p.id}" data-field="stock" value="${p.stock}"></label></div>`).join(''); }
    $('#admin-products').onchange = e => { const input = e.target; if (!input.dataset.field) return; const p = edits.find(p => p.id === Number(input.dataset.id)); const field = input.dataset.field; if (field === 'name') { if (!input.value.trim()) { input.value = p.name; return; } p.name = input.value.trim(); } else { const num = Number(input.value); if (!Number.isInteger(num) || num < (field === 'price' ? 1 : 0)) { input.value = p[field]; return; } p[field] = num; } save('futurefpv-admin-v1', edits); $('#admin-status').textContent = 'Saved in this browser. Export and publish the file to update the public store.'; };
    $('#export-products').onclick = () => { const blob = new Blob(['/* Future FPV catalogue — prices in INR. */\nwindow.PRODUCTS = ' + JSON.stringify(edits,null,2) + ';\n'], {type:'text/javascript'}); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'products.js'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); };
    $('#reset-products').onclick = () => { edits = products.map(p => ({...p})); save('futurefpv-admin-v1', edits); renderAdmin(); $('#admin-status').textContent = 'Local edits reset to the products.js catalogue.'; }; renderAdmin();
  }
})();
