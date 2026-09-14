# TradersProp + Pesapal merged checkout

The client website now calls the same-origin Vercel API for Pesapal checkout. The Pesapal implementation is the API 3.0 flow: RequestToken -> RegisterIPN -> SubmitOrderRequest -> provider redirect -> callback/IPN -> GetTransactionStatus.

## Vercel environment variables
- `PESAPAL_CONSUMER_KEY`
- `PESAPAL_CONSUMER_SECRET`
- `PESAPAL_BASE_URL` (optional; defaults to `https://pay.pesapal.com/v3`)
- `NEXT_PUBLIC_APP_URL` (recommended; exact public HTTPS TradersProp URL, no trailing slash)
- `SUPABASE_URL`
- `SUPABASE_SECRET_KEY` (or existing `SUPABASE_SERVICE_ROLE_KEY`)

## Pesapal dashboard
Register the public IPN URL:
`https://YOUR-DOMAIN/api/pesapal/ipn`

The checkout API also registers the same URL with Pesapal before each order so the notification id is always current.

## Supabase
Run `supabase/schema.sql` once. Payment activation must remain server-side: a browser return alone never marks an order successful; the callback/IPN re-checks the definitive Pesapal transaction status.

## Frontend endpoints
- `POST /api/v1/payments/pesapal/checkout`
- `GET /api/v1/payments/pesapal/status/:reference`
- `GET /api/pesapal/callback`
- `GET|POST /api/pesapal/ipn`

The browser amount is checked against the server's plan catalogue and the `TRADERSPROP25` discount is recalculated on the server.
