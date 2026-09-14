# TradersProp + Supabase + Vercel

This package is wired to the TradersProp Supabase project through the server-side Supabase client.

## Vercel environment variables

Add these variables to the Vercel project for **Production**, **Preview**, and **Development** as needed:

```text
SUPABASE_URL=https://hlwdhijbsysvgvocvqrz.supabase.co
SUPABASE_SECRET_KEY=<Supabase secret key>
```

Do **not** put the Supabase secret key in `index.html`, `config.js`, GitHub, or any browser-visible variable.

For existing deployments that still use the legacy name, `SUPABASE_SERVICE_ROLE_KEY` is accepted as a fallback, but the current recommended server-side variable is `SUPABASE_SECRET_KEY`.

## Database

The project already contains TradersProp tables including `payment_orders`, `payments`, `profiles`, `challenge_accounts`, KYC, competition, and support tables. The payment order table has been aligned with this package with:

- `provider`
- `provider_reference`
- `provider_tracking_id`

The payment APIs use Supabase server-side to record payment attempts and provider responses.

## Health check

After deployment, open:

```text
/api/v1/supabase/health
```

A successful connection returns JSON containing:

```json
{"ok":true,"service":"supabase","database":"connected"}
```

## Security

The browser should use only public/publishable Supabase credentials if a direct browser connection is ever added. Payment provider secrets and the Supabase secret key must remain server-side.
