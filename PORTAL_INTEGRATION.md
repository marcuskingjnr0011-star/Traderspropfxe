# TradersProp portal integration

The client site shares the same Vercel API and Supabase project with the Admin and Support sites.

Set these values in `config.js` when the final domains are known:
- `TRADERSPROP_API_BASE`
- `TRADERSPROP_PORTALS.adminUrl`
- `TRADERSPROP_PORTALS.supportUrl`

Never put Paystack secret keys, Supabase secret keys, database passwords, or other private credentials in this file.
