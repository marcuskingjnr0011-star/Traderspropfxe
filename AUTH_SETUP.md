# TradersProp production authentication

This build uses Supabase Auth for email/password authentication. Passwords are never stored in the TradersProp browser or `profiles` table.

## Vercel environment variables
Set these for Production (and Preview if you test previews):

- `SUPABASE_URL` — Supabase project URL
- `SUPABASE_SECRET_KEY` — Supabase server secret key (legacy `SUPABASE_SERVICE_ROLE_KEY` is also accepted)
- `SUPABASE_ANON_KEY` — optional; the server can use `SUPABASE_SECRET_KEY` for authentication if this is not set
- `ALLOWED_ORIGIN` — normally `https://tradersprop.com` (use `*` only when you intentionally need unrestricted cross-origin access)

## Supabase SQL
Run `schema.sql` in the Supabase SQL Editor. It adds `profiles.auth_user_id` and a unique index for the Supabase Auth user.

## Supabase Auth
Email/password sign-up is handled by the server with email confirmation enabled automatically for the created account. The server-side login route accepts the Supabase publishable/anon key when provided and securely falls back to the server secret key when it is not. The login route returns a short-lived Supabase access token to the browser, which the existing dashboard sends as a Bearer token for authenticated API requests.

Phone is optional during signup and can be verified later.

## Important
Do not put `SUPABASE_SECRET_KEY` / service-role credentials in `index.html`, `config.js`, or any `NEXT_PUBLIC_*` browser variable.
