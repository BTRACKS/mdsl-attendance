# Tech Support / IT Portal — Phase 1

Standalone portal for Multidigital Service Limited. It is fully separate from the
main E-Attendance website: its own folder, its own HTML/CSS/JS, its own login.
It is not linked from the main navigation, footer or dashboard.

## Files

| File | Purpose |
|---|---|
| `index.html` | Portal shell: login screen, access-denied screen, portal dashboard |
| `support.css` | Standalone stylesheet using the same navy/amber design language |
| `support.js` | Supabase auth, session check, role resolution, connection checks |
| `SUPABASE-SETUP.sql` | One-time database setup (role table, RLS, helper functions) |

## Deploy

1. Upload the whole `support/` folder to the web host, e.g. `https://yoursite.com/support/`.
2. Optionally drop `favicon.png` and `logo-mark.png` into the folder (copies of the
   main site's files) — the layout works without them.
3. Do **not** add a link to `/support/` anywhere on the main site.
4. Run `SUPABASE-SETUP.sql` once in the Supabase SQL editor.
5. Uncomment and edit section 7 of the SQL to grant yourself the `admin` role.

## What Phase 1 proves

- Sign-in works against the **existing** Supabase project (no second user system).
- The portal identifies the logged-in user (id, email, provider, last sign-in).
- Profile data is read from the existing `profiles` table under RLS.
- Role check runs server-side via `portal_role()` / `support_roles`, with a
  fallback to the legacy `profiles.role = 'admin'` so current admins are not locked out.
- Anyone without `admin` or `it_support` sees the access-denied screen.

## Security notes

- Access is enforced in the database (RLS + security-definer functions), not by
  hiding the page. The publishable key in `support.js` is safe in the browser.
- Roles live in their own `support_roles` table — never on `profiles` — to avoid
  privilege-escalation.
- The page is marked `noindex, nofollow`.

## Not included yet (Phase 2)

Ticketing, device/asset register, and role-management UI are rendered as
placeholder cards only.
