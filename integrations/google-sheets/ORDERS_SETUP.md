# Automatic orders and private admin dashboard

## Status

Active and verified for COD, UPI and Razorpay. Clearly labelled synthetic test orders were removed after verification. The deployment steps below are retained for future updates.

## What changes after activation

Every checkout saves an order before showing payment instructions, regardless of whether the customer selects cash on delivery, UPI or Razorpay. The server checks stock and recalculates the total using Products. A successful save returns a server-generated order ID. Repeating the same request reuses the saved order rather than creating a duplicate. A changed request with the same key is rejected.

Orders are saved in a separate private spreadsheet:
https://docs.google.com/spreadsheets/d/1pLzUlhWnbZE5Zt6dHxqCRlOWg5Qa5j8LXfuXoUsP_Ns/edit

Customers can optionally send a WhatsApp follow-up after saving. WhatsApp sending and payment completion are not prerequisites for recording an order. Failed or abandoned payments remain Unverified; selecting a method does not mean it has been paid.

## Owner activation — keep the existing public URL

1. Open the existing product spreadsheet and choose **Extensions → Apps Script**.
2. Replace the entire contents of **Code.gs** with the updated code from the product Sheet's **Apps Script** tab, cell **A2** (or Code.gs in this repository). It includes the dashboard HTML; no second script file is required.
3. Save. Choose **Deploy → Manage deployments**, select the existing public web-app deployment, click its pencil/edit icon, then choose **Version → New version**.
4. Keep **Execute as: Me** and **Who has access: Anyone**. Click **Deploy**. Review any additional Google authorisation request: the script now accesses the private Orders Sheet and checks the signed-in user's email for admin access.
5. Send the deployment URL or confirm that the same /exec URL has been updated. The assistant must verify `orderCapture:1` and a test order before claiming the feature is live. Both spreadsheets remain private; do not publish either Sheet to the web.

The public product endpoint still returns only product fields. The POST endpoint accepts order submissions but does not list customers. There is no anonymous order-history lookup.

## Open the private dashboard

Once activated, open admin.html and choose **Open private order dashboard**. It opens the existing /exec URL with **?page=admin**. Sign in as the owner of the private Orders Sheet. The backend checks the signed-in email for the page AND every admin read/update call. Anonymous users, blank identities, and other accounts are denied. Effective-user identity is never used as an authorisation substitute.

If Google does not expose your signed-in identity on the public execute-as-owner deployment, create a SECOND web-app deployment in the SAME project with **Execute as: User accessing the web app** and **Who has access: Only myself**. Open that URL with ?page=admin, and send it so the admin-page link can be updated. Keep the original Anyone deployment for the public catalogue and checkout. Never change the public deployment to Only myself, which would stop customers ordering.

The dashboard shows the latest 500 orders and refreshes every 30 seconds while visible. Older records remain in the Orders Sheet. Search by order ID, name or phone, filter delivery status, and update fulfilment/payment status. Changes from another tab are detected before overwriting.

## Payment and stock limitations

Razorpay automatic payment creation/webhook verification is not implemented. Hosted payment links, UPI and COD all record an order first, but you must verify actual payment independently. No card details are collected by this website.

Automatic stock deduction is active. All payment methods deduct on save, and unshipped cancellations restore stock once. Earlier orders keep Legacy manual handling. Refund verification remains manual. See STOCK_SETUP.md for future deployments.

Google quotas apply. The order endpoint is intentionally public to accept customer submissions; the server validates payload size, quantities, stock and totals, but this does not establish a customer's identity or provide advanced spam prevention. Never share the Orders Sheet or commit exported customer records to GitHub.
