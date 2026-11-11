# Future FPV

A simple online storefront for drones and FPV parts in India. Built with plain HTML, CSS and JavaScript. No framework, installation or build command is needed.

## Preview the website

Download or clone this repository and open **index.html** in your browser. Keep the css, js and images folders alongside it.

For a local web server, open a terminal in this folder and run:

```bash
python -m http.server 8000
```

Then visit http://localhost:8000. On some computers the command is `python3` instead of `python`.

Cart data uses localStorage. A web server or HTTPS hosting gives more consistent cart storage than opening local files directly. Google Fonts needs internet access; fallback fonts work offline.

## Pages and features

- Home, Shop, Product Details, Cart with Checkout, About and Contact.
- Eight sample products, category filters, search and price sorting.
- Working cart with quantities, removal, totals and browser storage.
- Prices in Indian rupees and ₹35 flat delivery across India.
- WhatsApp order requests and enquiries connected to +91 9310522469.
- UPI setup area and an optional Razorpay hosted payment link.
- Mobile navigation, beginner guidance, compatibility notes and FAQs.
- A separate admin.html page for local stock editing and a manual order register, accessible by direct URL.

## Edit the store

- **js/products.js:** edit product names, prices, stock, descriptions and image paths.
- **js/main.js:** edit the STORE settings for contact details, UPI, Razorpay payment link and shipping.
- **css/style.css:** edit colours, fonts and layouts.
- **images/:** replace sample illustrations with real product photos and update their alt text in products.js.

The admin page edits a local copy of the catalogue. Download its updated products.js file, replace js/products.js in this repository and publish the change. Local edits alone do not update other visitors' stock.

## Before taking real orders

This is a pre-launch storefront with sample products and illustrations. Replace them with real products and accurate specifications, publish your shipping, returns and warranty terms, and finish payment setup before accepting orders.

Checkout opens a prepared WhatsApp message. Customers must press Send in WhatsApp. It does not create a confirmed order, reserve stock or automatically collect payment.

Razorpay is not fully integrated. You can configure a public hosted payment link after confirming the correct order amount. Automated payment creation and verification require a secure backend. Never put a Razorpay secret key or other credentials in website files.

UPI payments need manual confirmation. Customer addresses and order details go through WhatsApp. The admin page provides a manual order register: add received WhatsApp orders, search by customer or phone, filter and change fulfilment status, track payment status manually, and download/restore JSON backups. This register is stored only in the current browser profile on the current website origin. It does not receive orders automatically or sync across devices or between GitHub Pages and the hosted preview. There is no admin login. Anyone with access to the same browser profile can read local entries. Backups contain customer details: keep them private and never commit them to GitHub. A secure shared dashboard, automatic order capture and live inventory need a backend or ecommerce service.

## Publish with GitHub Pages

1. Push these files to your GitHub repository.
2. Open the repository's **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**.
4. Select **main** and **/(root)**, then click **Save**.
5. Wait for GitHub to display the published URL. Test your pages, cart and WhatsApp messages there.

A public repository is the simplest option for free GitHub Pages. No build tools are required. You can connect your existing domain in Pages settings later.

## Social sharing and checks

Every page includes a title, description and Open Graph metadata. Before launch, replace the local social-image placeholder with an absolute HTTPS URL to a PNG or JPG on your final domain, and add canonical and og:url values. Product metadata changes in JavaScript; crawlers that do not run JavaScript see the generic product-page metadata.

JavaScript syntax, static links and core interactions were checked during development. Rendered mobile layouts still need a visual check at 375px width. Check real payment and contact settings before launch.
