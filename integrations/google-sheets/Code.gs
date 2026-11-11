/* Future FPV: public catalogue + write-only order intake + owner-only dashboard.
 * Keep both spreadsheets PRIVATE. Never publish the Orders Sheet.
 * Replace Code.gs in the existing Apps Script project with this complete file.
 * Update the PUBLIC deployment (execute as Me / Anyone) to a new version.
 * The admin route and every admin function independently require the Sheet owner.
 */
const PRODUCT_SPREADSHEET_ID = '14vTExbmQ6j0hCeJB1Q88zEUmSDKMyMLfN0wixPqQD6I';
const ORDER_SPREADSHEET_ID = '1pLzUlhWnbZE5Zt6dHxqCRlOWg5Qa5j8LXfuXoUsP_Ns';
const SHIPPING_INR = 35;
const ORDER_HEADERS = ['requestKey','requestHash','orderId','createdAt','customer','phone','address','pincode','itemsJSON','subtotal','shipping','total','paymentMethod','paymentStatus','orderStatus','updatedAt','inventoryState','inventoryTxn','inventoryTargetStatus'];
const METHODS = ['Cash on delivery','UPI','Razorpay'];
const ORDER_STATES = ['New','Confirmed','Packed','Shipped','Delivered','Cancelled'];
const PAYMENT_STATES = ['Unverified','Paid','Refunded'];

function doGet(e) {
  if (e && e.parameter && e.parameter.page === 'admin') {
    try { requireAdmin_(); return HtmlService.createHtmlOutput(ADMIN_HTML).setTitle('Future FPV — Private Orders'); }
    catch (_) { return HtmlService.createHtmlOutput('<h1>Private admin dashboard</h1><p>Sign in to Google as the owner of the Orders Sheet. No order data is available without that identity.</p><p>If Google does not expose your identity, create a separate Web app deployment: execute as User accessing the web app, access Only myself. Open its URL with ?page=admin.</p>'); }
  }
  try {
    if (e && e.parameter && e.parameter.action && e.parameter.action !== 'products') return jsonOutput_({ok:false,message:'Unsupported request.'});
    return jsonOutput_({ok:true,products:catalogueSnapshot_(),orderCapture:1,stockAutomation:typeof Sheets!=='undefined'?1:0,inventoryVersion:1,updatedAt:new Date().toISOString()});
  } catch (_) { return jsonOutput_({ok:false,message:'Product data unavailable. Check the Products tab and script permissions.'}); }
}
function doPost(e) {
  try {
    if (!e || !e.postData || typeof e.postData.contents !== 'string' || e.postData.contents.length > 16000) fail_('Invalid order request.');
    const payload = JSON.parse(e.postData.contents);
    if (payload.action !== 'create_order') fail_('Unsupported request.');
    return jsonOutput_({ok:true,order:createOrder_(payload)});
  } catch (error) { return jsonOutput_({ok:false,message:error && error.safeMessage ? error.safeMessage : 'Could not save your order. Please retry with the same request ID.'}); }
}
function fail_(message) { const error = new Error(message); error.safeMessage = message; throw error; }
function jsonOutput_(value) { return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON); }
function readProducts_() {
  const sheet = SpreadsheetApp.openById(PRODUCT_SPREADSHEET_ID).getSheetByName('Products');
  if (!sheet || sheet.getLastRow() < 2) throw new Error('Missing product sheet');
  const rows = sheet.getRange(1,1,sheet.getLastRow(),4).getValues();
  if (rows[0].join(',') !== 'id,name,price,stock') throw new Error('Invalid product headers');
  const ids = new Set();
  return rows.slice(1).filter(row=>row.some(value=>value!=='')).map(row=>{
    const [id,name,price,stock] = row;
    if (!Number.isSafeInteger(id)||id<1||ids.has(id)||typeof name!=='string'||!name.trim()||typeof price!=='number'||!Number.isFinite(price)||price<=0||price>100000000||!Number.isSafeInteger(stock)||stock<0) throw new Error('Invalid catalogue');
    ids.add(id); return {id,name:name.trim(),price,stock};
  });
}
function ordersSheet_() {
  const sheet = SpreadsheetApp.openById(ORDER_SPREADSHEET_ID).getSheetByName('Orders');
  if (!sheet || sheet.getRange(1,1,1,ORDER_HEADERS.length).getValues()[0].join('|') !== ORDER_HEADERS.join('|')) throw new Error('Orders sheet not configured');
  return sheet;
}
function cleanText_(value,min,max,label) {
  if (typeof value !== 'string') fail_('Check '+label+'.');
  const text = value.trim();
  if (text.length<min||text.length>max||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(text)) fail_('Check '+label+'.');
  return text;
}
function cellText_(value) { return /^[=+\-@\t\r]/.test(value) ? "'"+value : value; }
function hash_(value) { return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,value,Utilities.Charset.UTF_8).map(byte=>(byte&255).toString(16).padStart(2,'0')).join(''); }
function rowOrder_(row) {
  return {id:String(row[2]),createdAt:String(row[3]),customer:String(row[4]),phone:String(row[5]),address:String(row[6]),pincode:String(row[7]),items:JSON.parse(row[8]),subtotal:Number(row[9]),shipping:Number(row[10]),total:Number(row[11]),payment:String(row[12]),paymentState:String(row[13]),status:String(row[14]),updatedAt:String(row[15]),inventoryState:String(row[16]||'Legacy')};
}
function publicReceipt_(row) {
  const o=rowOrder_(row);
  if (o.status === 'Cancelled') fail_('This order was cancelled. Start a separate order request if you wish to order again.');
  if (['Reserving','Releasing','Failed'].includes(o.inventoryState)) fail_('Your order needs another stock check. Retry with the same request ID.');
  // A public receipt never returns customer contact/address details or other orders.
  return {id:o.id,items:o.items,subtotal:o.subtotal,shipping:o.shipping,total:o.total,payment:o.payment,paymentState:o.paymentState,stockDeducted:o.inventoryState==='Deducted'};
}
function findRequest_(sheet,key) {
  const n=sheet.getLastRow();
  if (n<2) return null;
  const found=sheet.getRange(2,1,n-1,1).createTextFinder(key).matchEntireCell(true).useRegularExpression(false).findNext();
  return found ? sheet.getRange(found.getRow(),1,1,ORDER_HEADERS.length).getValues()[0] : null;
}
function createOrder_(p) {
  if(typeof Sheets==='undefined')fail_('Stock service setup is incomplete. Please contact the store before ordering.');
  if (typeof p.requestKey!=='string'||!/^FF-[0-9]{8}-[A-F0-9]{24}$/.test(p.requestKey)) fail_('Invalid request ID. Refresh checkout and try again.');
  const customer=cleanText_(p.customer,1,80,'your name');
  const phone=cleanText_(p.phone,10,10,'your phone number');
  if (!/^[6-9][0-9]{9}$/.test(phone)) fail_('Use a 10-digit Indian mobile number.');
  const address=cleanText_(p.address,10,500,'your address');
  const pincode=cleanText_(p.pincode,6,6,'the PIN code');
  if (!/^[1-9][0-9]{5}$/.test(pincode)) fail_('Use a six-digit PIN code.');
  if (!METHODS.includes(p.payment)) fail_('Choose a payment method.');
  if (p.consent!==true) fail_('Consent is required to save delivery details.');
  if (!Array.isArray(p.items)||p.items.length<1||p.items.length>30) fail_('Check your cart.');
  const seen=new Set();
  const requested=p.items.map(item=>{
    if (!item||!Number.isSafeInteger(item.id)||seen.has(item.id)||!Number.isSafeInteger(item.qty)||item.qty<1||item.qty>999) fail_('Check product quantities.');
    seen.add(item.id);return {id:item.id,qty:item.qty};
  }).sort((a,b)=>a.id-b.id);
  if (typeof p.expectedTotal!=='number'||!Number.isFinite(p.expectedTotal)||p.expectedTotal<=0) fail_('Check your order total.');
  const fingerprint=hash_(JSON.stringify({customer,phone,address,pincode,payment:p.payment,items:requested,expectedTotal:p.expectedTotal}));
  const lock=LockService.getScriptLock();
  if (!lock.tryLock(10000)) fail_('The store is busy. Please retry with the same request ID.');
  try {
    const sheet=ordersSheet_();
    recoverInventory_(sheet);
    const existing=findRequest_(sheet,p.requestKey);
    if (existing) {
      if (existing[1]!==fingerprint) fail_('This request ID already belongs to a saved order. Start a separate order request for changed details.');
      return publicReceipt_(existing);
    }
    if(sheet.getLastRow()>50000) fail_('Online orders are temporarily unavailable. Please contact the store.');
    const products=readProducts_();
    const items=requested.map(item=>{
      const product=products.find(p=>p.id===item.id);
      if (!product||item.qty>product.stock) fail_('An item is unavailable or its stock changed. Refresh the shop and review your cart.');
      return {id:product.id,name:product.name,qty:item.qty,price:product.price};
    });
    const subtotal=Math.round(items.reduce((sum,item)=>sum+Math.round(item.price*100)*item.qty,0))/100;
    const total=Math.round((subtotal+SHIPPING_INR)*100)/100;
    if (Math.round(p.expectedTotal*100)!==Math.round(total*100)) fail_('Prices changed. Refresh the shop and review your order before submitting again.');
    const now=new Date().toISOString();
    const orderId='FF-'+Utilities.formatDate(new Date(),'Asia/Kolkata','yyyyMMdd')+'-'+Utilities.getUuid().replace(/-/g,'').slice(0,24).toUpperCase();
    const row=[p.requestKey,fingerprint,orderId,now,cellText_(customer),phone,cellText_(address),pincode,JSON.stringify(items),subtotal,SHIPPING_INR,total,p.payment,'Unverified','New',now,'Reserving',newInventoryTxn_(),'New'];
    const rowNumber=sheet.getLastRow()+1;
    // Write the recovery journal BEFORE touching stock. No success is returned yet.
    sheet.getRange(rowNumber,1,1,ORDER_HEADERS.length).setValues([row]);
    SpreadsheetApp.flush();
    completeInventory_(sheet,rowNumber);
    return publicReceipt_(sheet.getRange(rowNumber,1,1,ORDER_HEADERS.length).getValues()[0]);
  } finally { lock.releaseLock(); }
}
function requireAdmin_() {
  const active=String(Session.getActiveUser().getEmail()||'').toLowerCase();
  const owner=SpreadsheetApp.openById(ORDER_SPREADSHEET_ID).getOwner();
  const allowed=owner ? String(owner.getEmail()||'').toLowerCase() : '';
  // Never use getEffectiveUser(): public execute-as-owner deployments would bypass auth.
  if (!active||!allowed||active!==allowed) throw new Error('Access denied. Sign in as the owner of the private Orders Sheet.');
}
function adminListOrders() {
  requireAdmin_();
  const lock=LockService.getScriptLock();if(!lock.tryLock(10000))throw new Error('Store busy. Refresh shortly.');
  try {
    const sheet=ordersSheet_();recoverInventory_(sheet);const last=sheet.getLastRow();
    const start=Math.max(2,last-499);
    const orders=last<2 ? [] : sheet.getRange(start,1,last-start+1,ORDER_HEADERS.length).getValues().reverse().map(rowOrder_);
    return {orders};
  } finally {lock.releaseLock();}
}
function adminUpdateOrder(id,status,paymentState,expectedUpdatedAt) {
  requireAdmin_();
  if(typeof id!=='string'||!/^FF-[0-9]{8}-[A-F0-9]{24}$/.test(id)||!ORDER_STATES.includes(status)||!PAYMENT_STATES.includes(paymentState)) throw new Error('Invalid order update.');
  const lock=LockService.getScriptLock();if(!lock.tryLock(10000))throw new Error('Store busy. Try again.');
  try {
    const sheet=ordersSheet_();recoverInventory_(sheet);const last=sheet.getLastRow();
    const found=last<2?null:sheet.getRange(2,3,last-1,1).createTextFinder(id).matchEntireCell(true).useRegularExpression(false).findNext();
    if(!found)throw new Error('Order not found.');
    const row=found.getRow();const existing=sheet.getRange(row,1,1,ORDER_HEADERS.length).getValues()[0];
    if(String(existing[15])!==expectedUpdatedAt)throw new Error('This order changed in another tab. Refresh before updating.');
    const state=String(existing[16]||'Legacy');
    if (status==='Cancelled' && state==='Deducted' && ['Shipped','Delivered'].includes(String(existing[14]))) throw new Error('Shipped or delivered goods need a manual return check before restocking.');
    if (state==='Failed' && status!=='Cancelled') throw new Error('This order failed its stock check. Create a fresh order after reviewing stock.');
    const release=status==='Cancelled' && state==='Deducted';
    const reserve=status!=='Cancelled' && state==='Restored';
    if (release||reserve) {
      // Keep a durable intention so a timeout cannot duplicate a stock adjustment.
      sheet.getRange(row,14,1,6).setValues([[paymentState,existing[14],nextTimestamp_(existing[15]),reserve?'Reserving':'Releasing',newInventoryTxn_(),status]]);
      SpreadsheetApp.flush();completeInventory_(sheet,row);
      if(sheet.getRange(row,17,1,1).getValues()[0][0]==='Failed')throw new Error('Not enough stock to reopen this order. It remains cancelled.');
    } else {
      // Older orders are Legacy: stock may already have been adjusted by hand.
      sheet.getRange(row,14,1,6).setValues([[paymentState,status,nextTimestamp_(existing[15]),state,String(existing[17]||''),status]]);
      SpreadsheetApp.flush();
    }
    return {ok:true};
  } finally {lock.releaseLock();}
}


// Inventory is a recoverable operation across two private spreadsheets.
// A ScriptLock serialises site orders. One Sheets API batch changes ALL purchased
// stock cells plus their transaction markers atomically inside the Products sheet.
// A pending order row is the durable journal; recovery finishes it before another
// site transaction can overwrite those markers. Retries never reapply a marker.
function newInventoryTxn_() {return Utilities.getUuid().replace(/-/g,'');}
function nextTimestamp_(previous) {return new Date(Math.max(Date.now(),(Date.parse(previous)||0)+1)).toISOString();}
function catalogueSnapshot_() {
  const lock=LockService.getScriptLock();if(!lock.tryLock(10000))throw new Error('Inventory busy');
  try {recoverInventory_(ordersSheet_());return readProducts_();} finally {lock.releaseLock();}
}
function recoverInventory_(sheet) {
  const last=sheet.getLastRow();if(last<2)return;
  const pending=sheet.getRange(2,17,last-1,1).createTextFinder('^(Reserving|Releasing)$').useRegularExpression(true).matchEntireCell(true).findAll();
  pending.forEach(cell=>completeInventory_(sheet,cell.getRow()));
}
function completeInventory_(sheet,rowNumber) {
  const row=sheet.getRange(rowNumber,1,1,ORDER_HEADERS.length).getValues()[0];
  const state=String(row[16]);if(!['Reserving','Releasing'].includes(state))return;
  const target=String(row[18]);
  if(!ORDER_STATES.includes(target)||!row[17])throw new Error('Invalid inventory journal');
  try {applyInventory_(JSON.parse(row[8]),String(row[17]),state==='Releasing'?1:-1);}
  catch(error) {
    if(error.inventoryShortage) {
      // A rejected reservation does not touch ANY stock cells.
      sheet.getRange(rowNumber,15,1,5).setValues([['Cancelled',nextTimestamp_(row[15]),'Failed',row[17],'Cancelled']]);
      SpreadsheetApp.flush();return;
    }
    // Unknown API outcomes stay pending; marker checks make the next retry safe.
    throw error;
  }
  sheet.getRange(rowNumber,15,1,5).setValues([[target,nextTimestamp_(row[15]),state==='Releasing'?'Restored':'Deducted',row[17],target]]);
  SpreadsheetApp.flush();
}
function applyInventory_(items,txn,direction) {
  const sheet=SpreadsheetApp.openById(PRODUCT_SPREADSHEET_ID).getSheetByName('Products');
  if(!sheet||sheet.getRange(1,5,1,1).getValues()[0][0]!=='inventoryTxn')throw new Error('Inventory metadata header missing');
  const values=sheet.getRange(2,1,sheet.getLastRow()-1,5).getValues();
  const targets=items.map(item=>{
    const matches=values.map((row,index)=>({row,index})).filter(entry=>entry.row[0]===item.id);
    if(matches.length!==1||!Number.isSafeInteger(item.qty)||item.qty<1)throw new Error('Inventory product is missing or duplicated');
    return {item,row:matches[0].row,rowNumber:matches[0].index+2};
  });
  const applied=targets.filter(t=>String(t.row[4]||'')===txn).length;
  if(applied===targets.length)return;
  if(applied!==0)throw new Error('Inventory markers conflict. Owner review required.');
  const requests=targets.map(t=>{
    const current=t.row[3];const next=current+direction*t.item.qty;
    if(!Number.isSafeInteger(current)||current<0||!Number.isSafeInteger(next))throw new Error('Invalid stock count');
    if(next<0){const e=new Error('Insufficient stock');e.inventoryShortage=true;throw e;}
    return {updateCells:{range:{sheetId:sheet.getSheetId(),startRowIndex:t.rowNumber-1,endRowIndex:t.rowNumber,startColumnIndex:3,endColumnIndex:5},rows:[{values:[{userEnteredValue:{numberValue:next}},{userEnteredValue:{stringValue:txn}}]}],fields:'userEnteredValue'}};
  });
  // The REST batch is all-or-nothing. This avoids half-updated multi-item orders.
  if(typeof Sheets==='undefined')throw new Error('Enable the Google Sheets API service in Apps Script before accepting orders.');
  Sheets.Spreadsheets.batchUpdate({requests},PRODUCT_SPREADSHEET_ID);
}

// Self-contained dashboard HTML: no second Apps Script file is needed.
const ADMIN_HTML = "<!doctype html><html lang=\"en\"><head><base target=\"_top\"><meta name=\"viewport\" content=\"width=device-width, initial-scale=1\"><meta name=\"robots\" content=\"noindex,nofollow\"><title>Future FPV — Private Orders</title><style>\n*{box-sizing:border-box}body{font:15px/1.6 Arial,sans-serif;background:#f7f8f3;color:#192722;margin:0;padding:20px}main{max-width:1100px;margin:auto}h1{font-size:32px;line-height:1.2}button,input,select{font:inherit;min-height:44px;padding:10px;border:1px solid #b9c5b6;border-radius:4px}button{cursor:pointer;background:#f56832;color:#192722;font-weight:bold}button:disabled{opacity:.5;cursor:wait}label{display:grid;gap:5px}.toolbar,.controls,.stats{display:flex;flex-wrap:wrap;gap:15px;align-items:end;margin:20px 0}.toolbar label{flex:1;min-width:180px}.panel{background:white;border:1px solid #dce0d8;border-radius:6px;padding:20px;margin-bottom:15px}.head{display:flex;justify-content:space-between;flex-wrap:wrap;gap:12px}.muted{color:#59665d;font-size:13px}.preserve{white-space:pre-wrap;overflow-wrap:anywhere}#message{white-space:pre-wrap}.stats>span{background:#e9eee5;padding:12px 18px;border-radius:4px}a{color:#a13c17}button:focus-visible,input:focus-visible,select:focus-visible{outline:3px solid #e57840;outline-offset:3px}@media(max-width:400px){body{padding:12px}.panel{padding:15px}.controls>*{width:100%}}\n</style></head><body><main><p class=\"muted\">FUTURE FPV · PRIVATE GOOGLE-ACCOUNT ACCESS</p><h1>Customer orders</h1><p>All payment methods appear here after checkout saves successfully. Payment preferences are not payment confirmations. Verify bank, UPI or Razorpay receipts before marking an order Paid.</p><p class=\"muted\">Stock decreases when an order is saved, including unpaid requests. Cancelling an unshipped order restores it once. Older orders marked Legacy keep their existing manual stock handling. Shipped or delivered returns need a manual stock check.</p><div class=\"toolbar\"><label>Search by order ID, name or phone<input id=\"search\" type=\"search\"></label><label>Order status<select id=\"filter\"><option value=\"\">All statuses</option><option>New</option><option>Confirmed</option><option>Packed</option><option>Shipped</option><option>Delivered</option><option>Cancelled</option></select></label><button id=\"refresh\">Refresh orders</button></div><p id=\"message\" role=\"status\">Loading your orders…</p><div id=\"stats\" class=\"stats\"></div><div id=\"orders\"></div><p class=\"muted\">Shows the latest 500 orders. Refreshes every 30 seconds while this page is visible. Older records remain in the private Orders Sheet.</p></main><script>\n'use strict';\nlet orders=[],busy=false;\nconst $=id=>document.getElementById(id);\nconst statuses=['New','Confirmed','Packed','Shipped','Delivered','Cancelled'];\nconst paymentStates=['Unverified','Paid','Refunded'];\nconst money=n=>'₹'+Number(n).toLocaleString('en-IN',{maximumFractionDigits:2});\nfunction el(tag,text,cls){const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(cls)node.className=cls;return node}\nfunction render(){\n $('stats').replaceChildren(...[['Orders loaded',orders.length],['In progress',orders.filter(o=>!['Delivered','Cancelled'].includes(o.status)).length]].map(([label,n])=>el('span',label+': '+n)));\n const query=$('search').value.trim().toLowerCase();const filter=$('filter').value;\n const list=orders.filter(o=>(!filter||o.status===filter)&&`${o.id} ${o.customer} ${o.phone}`.toLowerCase().includes(query));\n $('orders').replaceChildren();\n if(!list.length){$('orders').append(el('p',orders.length?'No matching orders.':'No orders have been received yet.','panel'));return}\n list.forEach(o=>{\n  const card=el('article',undefined,'panel');const head=el('div',undefined,'head');head.append(el('h2',o.id),el('strong',money(o.total)));card.append(head);\n  card.append(el('p',new Date(o.createdAt).toLocaleString('en-IN',{timeZone:'Asia/Kolkata'})+' IST','muted'));\n  card.append(el('h3',o.customer),el('p','Phone: '+o.phone),el('p','Delivery: '+o.address+'\\nPIN: '+o.pincode,'preserve'));\n  const list=el('ul');o.items.forEach(item=>list.append(el('li',item.name+' × '+item.qty+' — '+money(item.price*item.qty))));card.append(list);\n  card.append(el('p','Stock handling: '+(o.inventoryState||'Legacy'),'muted'));\n  card.append(el('p',`Subtotal: ${money(o.subtotal)} · Shipping: ${money(o.shipping)} · Payment preference: ${o.payment}`));\n  const controls=el('div',undefined,'controls');\n  const status=el('select');statuses.forEach(s=>{const option=el('option',s);option.value=s;status.append(option)});status.value=o.status;\n  const payment=el('select');paymentStates.forEach(s=>{const option=el('option',s);option.value=s;payment.append(option)});payment.value=o.paymentState;\n  const statusLabel=el('label','Order status');statusLabel.append(status);const paymentLabel=el('label','Payment status (manual)');paymentLabel.append(payment);\n  const save=el('button','Update order');save.type='button';save.onclick=()=>{\n   if(status.value==='Cancelled'&&o.status!=='Cancelled'&&o.inventoryState==='Deducted'&&!confirm('Cancel this unshipped order and return its units to stock?'))return;\n   if(o.inventoryState==='Restored'&&status.value!=='Cancelled'&&!confirm('Reopening this order will deduct its units again if stock is available. Continue?'))return;\n   if(payment.value==='Paid'&&o.paymentState!=='Paid'&&!confirm('Have you independently verified the payment in your bank, UPI or Razorpay account?'))return;\n   save.disabled=true;$('message').textContent='Saving '+o.id+'…';\n   google.script.run.withSuccessHandler(()=>{busy=false;load()}).withFailureHandler(error=>{save.disabled=false;$('message').textContent=error.message||'Could not update order.'}).adminUpdateOrder(o.id,status.value,payment.value,o.updatedAt);\n  };\n  controls.append(statusLabel,paymentLabel,save);card.append(controls);$('orders').append(card);\n });\n}\nfunction load(){if(busy)return;busy=true;$('refresh').disabled=true;google.script.run.withSuccessHandler(result=>{orders=result.orders;render();$('message').textContent='Updated '+new Date().toLocaleTimeString('en-IN')+'. Customer data is visible only to the Sheet owner.';busy=false;$('refresh').disabled=false}).withFailureHandler(error=>{$('message').textContent=error.message||'Could not load orders. Sign in as the Sheet owner.';busy=false;$('refresh').disabled=false}).adminListOrders()}\n$('refresh').onclick=load;$('search').oninput=render;$('filter').onchange=render;setInterval(()=>{if(!document.hidden)load()},30000);load();\n</script></body></html>\n";
