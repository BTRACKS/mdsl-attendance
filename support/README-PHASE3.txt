Multidigital Service Limited — Tech Support Portal
Phase 3: Admin & Role Management
=================================================

Files
-----
home.html            Portal page (login, access denied, portal, role UI)
support.css          Styles (unchanged design language + role controls/modal)
support.js           Front-end logic incl. Phase 3 role management
SUPABASE-PHASE3.sql  Database roles, RLS policies and functions — run this first

Install
-------
1. Open the Supabase SQL editor for the shared project and run
   SUPABASE-PHASE3.sql in full.
2. Scroll to section 8 and uncomment the seed block with your own work email,
   then run it once so there is a first administrator.
   (Optionally run the legacy-migration block too.)
3. Upload home.html, support.css, support.js next to your existing site files
   (keep favicon.png / logo-mark.png where they already are).

Flow
----
Tech Support Login -> Users -> Select user -> Profile -> Role management ->
choose role -> Save role -> confirmation dialog -> Supabase updated.

Roles
-----
Admin       Users, profiles, role management. Future: attendance corrections,
            audit logs, IT administration.
IT Support  Portal access and support functions. Read-only on roles; cannot
            promote anyone to Admin.
Staff       No Tech Support portal access. Sees the "access denied" screen.

Safeguards
----------
* set_user_role() refuses any caller who is not an administrator, so typing a
  URL, opening dev tools or calling the REST API directly changes nothing.
* No INSERT/UPDATE/DELETE policy exists on public.user_roles, so the table
  cannot be written from the browser at all — only through the function.
* The last administrator cannot be demoted (own account or anyone else's).
* Roles are never stored on profiles; the legacy profiles.role column, if
  present, is made non-updatable by users.
* Only the publishable key ships in the browser. The service-role key is not
  used anywhere in this bundle.

Not in this phase (Phase 4 onward)
----------------------------------
Attendance/timestamp correction, manual resets, audit logs, database editing,
password administration.
