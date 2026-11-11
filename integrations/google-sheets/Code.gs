/* Read-only public product feed. Never add customer/order data to this feed.
   Paste into Extensions > Apps Script for the prepared Google Sheet. */
const PRODUCT_SPREADSHEET_ID = '14vTExbmQ6j0hCeJB1Q88zEUmSDKMyMLfN0wixPqQD6I';
function doGet() {
  try {
    const sheet = SpreadsheetApp.openById(PRODUCT_SPREADSHEET_ID).getSheetByName('Products');
    if (!sheet || sheet.getLastRow() < 2) throw new Error('Products are unavailable.');
    const rows = sheet.getRange(1, 1, sheet.getLastRow(), 4).getValues();
    if (rows[0].join(',') !== 'id,name,price,stock') throw new Error('Keep the id, name, price, stock headers unchanged.');
    const ids = new Set();
    const products = rows.slice(1).filter(row => row.some(value => value !== '')).map(row => {
      const [id, name, price, stock] = row;
      if (!Number.isSafeInteger(id) || id < 1 || ids.has(id) || typeof name !== 'string' || !name.trim() || typeof price !== 'number' || !Number.isFinite(price) || price <= 0 || price > 100000000 || !Number.isSafeInteger(stock) || stock < 0) throw new Error('Check product IDs, names, prices and stock. Use numbers, not currency text.');
      ids.add(id);
      return {id, name: name.trim(), price, stock};
    });
    return jsonOutput({ok: true, products, updatedAt: new Date().toISOString()});
  } catch (error) {
    // Do not expose stack traces, private Sheet content or account information.
    return jsonOutput({ok: false, message: 'Product data unavailable. Check the Products tab and script permissions.'});
  }
}
function jsonOutput(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}
