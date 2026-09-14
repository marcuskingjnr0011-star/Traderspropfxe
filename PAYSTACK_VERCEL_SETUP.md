# TradersProp — Paystack + Vercel payment setup

## Vercel environment variables

Set these in **Project → Settings → Environment Variables → Production**:

- `PAYSTACK_SECRET_KEY` — Paystack **Live Secret Key**. Keep this server-side only.
- `PAYSTACK_CALLBACK_URL` — `https://YOUR-VERCEL-DOMAIN.vercel.app/?payment=paystack-return`
- `ALLOWED_ORIGIN` — `https://YOUR-VERCEL-DOMAIN.vercel.app`
- `USD_KES_RATE` — the USD→KES rate used when the customer selects Kenyan mobile money (M-PESA/Airtel Money). Example: `129.50`.

The exact USD/KES rate is a business configuration value; update it when your pricing policy changes.

## Payment routing

- Visa / Mastercard → Paystack hosted Checkout in USD.
- M-PESA / Airtel Money → Paystack hosted Mobile Money checkout in KES, using `USD_KES_RATE` for conversion from the site's USD price.
- The browser never receives the Paystack secret key.

## Paystack webhook

Configure the Paystack webhook URL as:

`https://YOUR-VERCEL-DOMAIN.vercel.app/api/v1/payments/paystack/webhook`

The webhook validates the Paystack HMAC-SHA512 signature.

## Important production limitation

The payment API verifies transactions, but the uploaded frontend is still localStorage-driven. A production trading platform must connect verified payment events to a persistent database/order service before automatically granting a challenge or funded account. Do not treat a browser-side localStorage balance as proof of payment.

## Vercel root directory

This ZIP is the contents of the `www` web root. If you deploy the ZIP through a repository that contains an outer `TradersProp-Mobile-App` directory, set the Vercel **Root Directory** to the directory containing `index.html`, `api/`, `config.js`, `package.json`, and `vercel.json`.
