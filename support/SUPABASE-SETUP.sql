-- =====================================================================
-- Multidigital Service Limited — Tech Support / IT Portal (Phase 1)
-- Run this ONCE in the existing Supabase project (SQL Editor).
-- It adds ONLY a role table + helper functions. It does not duplicate
-- users, profiles or attendance data.
-- =====================================================================

-- 1. Role enum -------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'portal_role') then
    create type public.portal_role as enum ('admin', 'it_support', 'staff');
  end if;
end $$;

-- 2. Dedicated role table (NEVER store roles on profiles) --------------
create table if not exists public.support_roles (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       public.portal_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

-- 3. Data API grants (required — PostgREST has no defaults) ------------
grant select on public.support_roles to authenticated;
grant all    on public.support_roles to service_role;

-- 4. Row Level Security ------------------------------------------------
alter table public.support_roles enable row level security;

-- 5. Security-definer helpers (avoid recursive RLS) --------------------
create or replace function public.has_portal_role(_user_id uuid, _role public.portal_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.support_roles
    where user_id = _user_id and role = _role
  )
$$;

-- Highest role of the CURRENT user, or null. Used by the portal front-end.
create or replace function public.portal_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select r.role::text
       from public.support_roles r
      where r.user_id = auth.uid()
      order by case r.role when 'admin' then 1 when 'it_support' then 2 else 3 end
      limit 1),
    -- fall back to the legacy attendance role so existing admins keep access
    (select case when p.role = 'admin' then 'admin' else 'staff' end
       from public.profiles p where p.id = auth.uid())
  )
$$;

create or replace function public.has_portal_access()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.portal_role() in ('admin', 'it_support')
$$;

grant execute on function public.portal_role()       to authenticated;
grant execute on function public.has_portal_access() to authenticated;
grant execute on function public.has_portal_role(uuid, public.portal_role) to authenticated;

-- 6. Policies ----------------------------------------------------------
drop policy if exists "Users read own portal roles" on public.support_roles;
create policy "Users read own portal roles"
on public.support_roles
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "Admins read all portal roles" on public.support_roles;
create policy "Admins read all portal roles"
on public.support_roles
for select
to authenticated
using (public.has_portal_role(auth.uid(), 'admin'));

drop policy if exists "Admins manage portal roles" on public.support_roles;
create policy "Admins manage portal roles"
on public.support_roles
for all
to authenticated
using (public.has_portal_role(auth.uid(), 'admin'))
with check (public.has_portal_role(auth.uid(), 'admin'));

-- 7. Seed your first portal admins ------------------------------------
-- Replace the email(s), then run:
-- insert into public.support_roles (user_id, role)
-- select id, 'admin'::public.portal_role from auth.users where email = 'admin@multidigitalng.com'
-- on conflict do nothing;
--
-- insert into public.support_roles (user_id, role)
-- select id, 'it_support'::public.portal_role from auth.users where email = 'it@multidigitalng.com'
-- on conflict do nothing;

-- 8. Phase 2 note ------------------------------------------------------
-- Future IT tables should gate access with:
--   using (public.has_portal_access())
-- so the rules live in the database, not in the browser.
