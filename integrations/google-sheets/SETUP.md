# Connect the prepared Google Sheet

Sheet: https://docs.google.com/spreadsheets/d/14vTExbmQ6j0hCeJB1Q88zEUmSDKMyMLfN0wixPqQD6I/edit

## Current status

**Live sync is active.** The Sheet has all eight current products, and its read-only Apps Script web-app URL is configured in js/catalogue.js. Prices and stock are loaded on each new page load. The setup instructions below are retained for future redeployment.

## Owner steps

1. In the spreadsheet choose **Extensions → Apps Script**.
2. Copy all of `Code.gs` from this folder (also available in the Sheet's **Apps Script** tab, cell **A2**) into the script editor, replacing starter code. Save.
3. Choose **Deploy → New deployment → Web app**.
4. Set **Execute as: Me** and **Who has access: Anyone**.
5. Deploy and review/authorise the requested Google permissions with the Sheet owner's account. If your Google Workspace account blocks public web apps, ask for help instead of making the Sheet public.
6. Copy the generated URL ending in `/exec` and send it to the assistant. This URL contains no password; do not send Google credentials or tokens.

## Final connection

Set `endpoint` in `js/catalogue.js` to the verified web-app URL and deploy the site. Open the URL without signing in and check it returns `{ok:true,products:[...]}` with all eight IDs. Test a reversible price/stock change in the Sheet and check home, shop, product detail and cart use it. Restore the intended values afterwards. Until this verification is complete, do not claim the store is connected.

## Routine editing after activation

Edit only **price** and **stock** in the **Products** tab. Use numbers (no currency text) and whole numbers for stock. Zero means out of stock. Keep IDs and header names unchanged. Google saves automatically. Refresh the website to read the latest values; already open tabs do not update in real time. Product names, images and descriptions still come from products.js.

## Limits

The Sheet stays private. Anyone can read the deployed product feed, but the script has no public write endpoint. Do not put customer records in this product feed. No credentials are included in the website. Google quotas and service availability apply. If a configured feed fails or contains invalid/incomplete numbers, adding products and checkout are blocked rather than accepting an order using stale numbers. The existing product information remains visible with an availability warning.

This connection does not reserve or automatically decrement stock. WhatsApp orders still need manual confirmation, and the browser checkout is not a secure payment or pricing authority. To add or remove product IDs, update the static catalogue and the Sheet together.
