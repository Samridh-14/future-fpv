# Automatic stock deduction

## Status

Active and verified against the deployed Google script. A live test deducted one unit, retrying did not deduct again, and cancellation restored the unit. The test record was removed. The activation steps below are retained for future deployments.

## Activate in Google Apps Script

1. Open the product Sheet and choose **Extensions → Apps Script**.
2. Next to **Services** in the editor's left sidebar click **+**. Select **Google Sheets API**, version **v4**, identifier **Sheets**, and click **Add**. This is Google's Advanced Sheets service, not a paid SMS service. Default Apps Script Cloud projects enable the API automatically when the service is added; if you linked a custom Cloud project, enable the Sheets API there too.
3. Replace all of **Code.gs** with the updated code in the product Sheet's **Apps Script** tab, cell **A2**. Save.
4. Choose **Deploy → Manage deployments**, select the existing public deployment, click the pencil, then **Version → New version → Deploy**. Keep **Execute as: Me** and **Who has access: Anyone**. Review any Google authorisation request.
5. If you use a separate private admin deployment, update it to the same new version too. Old code must not keep accepting admin changes alongside the new inventory handler.
6. Tell the assistant when deployed. It must verify the inventory capability and a controlled test order before claiming stock deduction is live.

## Behaviour

- COD, UPI and Razorpay requests all deduct their quantities when the order is saved, before payment is confirmed.
- An order is only returned as successfully saved once its stock operation is complete.
- Each request has a stable key; retrying it does not create another order or deduct twice.
- A script lock serialises website orders. If stock is insufficient, the order is rejected. Multi-item stock and transaction markers change in one atomic Google Sheets API batch.
- A pending-order journal recovers interrupted updates before later site transactions proceed. If a stock update succeeded but its response was lost, the saved transaction marker prevents reapplying it.
- Setting an unshipped order to Cancelled in the private dashboard returns its units once. Reopening it deducts again only if stock is available.
- Shipped/delivered returns require a manual goods check, rather than automatic restocking.
- Older orders have Legacy stock handling. They are not retroactively deducted, and cancelling them does not add stock because it may already have been managed manually.
- Unpaid orders keep their units until you cancel them. No timed expiry or SMS is added.

## Sheet columns

Products column **D (stock)** still shows available units. Column **E (inventoryTxn)** is hidden internal bookkeeping. Orders columns **Q:S** track inventory state, operation ID and intended status. Do not edit or delete these internal values or manually delete pending order rows. Do not sort individual columns independently from their rows.

Edit stock only to set real available units after a stocktake/replenishment. Do not subtract an automatically deducted order again. Avoid editing stock cells while checkouts or cancellation updates are being processed: Google's ScriptLock coordinates script requests, not human edits in the spreadsheet UI. For busy stock operations, a transactional database is a stronger future option.

Old read-only product feeds keep ignoring these added metadata columns. Customer records remain in the separate private Orders Sheet; public product responses do not include them. Payment verification remains separate from stock handling.
