-- ========================================================
-- SOLO Asset Tracker — migration + data fix
-- Run in Supabase → SQL Editor → New query → paste → Run
-- ========================================================

-- 1) Activity log table (audit trail: who did what)
create table if not exists activity_log (
  id uuid primary key default gen_random_uuid(),
  ts timestamptz not null default now(),
  user_email text not null,
  entity_type text not null,   -- 'asset' | 'transfer' | 'disposal' | ...
  entity_id uuid,
  action text not null,        -- 'create' | 'update' | 'dispose' | 'transfer' | 'unwind_dispose' | ...
  summary text,
  payload jsonb
);
create index if not exists idx_activity_log_ts on activity_log(ts desc);
create index if not exists idx_activity_log_entity on activity_log(entity_id);
create index if not exists idx_activity_log_user on activity_log(user_email);
alter table activity_log enable row level security;

drop policy if exists activity_insert on activity_log;
create policy activity_insert on activity_log
  for insert to authenticated
  with check (is_allowed_user());

drop policy if exists activity_select on activity_log;
create policy activity_select on activity_log
  for select to authenticated
  using (is_allowed_user());

-- 2) Find duplicate disposals (same asset disposed twice)
select asset_id, count(*) as dupe_count, array_agg(id order by created_at) as disposal_ids
from disposals
group by asset_id
having count(*) > 1;

-- 3) Clean up duplicate disposals: keep the earliest, delete the rest
with ranked as (
  select id, asset_id, row_number() over (partition by asset_id order by created_at asc) as rn
  from disposals
)
delete from disposals where id in (select id from ranked where rn > 1);

-- 4) For any asset that has a disposal row but is still active, set status = 'disposed'
update assets a
set status = 'disposed', updated_at = now()
where a.status = 'active'
  and exists (select 1 from disposals d where d.asset_id = a.id);

-- 5) Verify
select 'disposals remaining' as label, count(*) as n from disposals
union all
select 'assets marked disposed', count(*) from assets where status='disposed'
union all
select 'orphan active-with-disposal', count(*) from assets a where a.status='active' and exists (select 1 from disposals d where d.asset_id=a.id);

-- ========================================================
-- 6) Form 4797 support: property_type on categories + assets
-- ========================================================
-- '1245' = personal property (equipment, vehicles, livestock incl. recip mares
--          and trading horses, AG fences) — full depreciation recapture as
--          ordinary income on disposal.
-- '1250' = real property (buildings, residential rental) — post-1986 SL
--          property typically has 0 ordinary recapture; full gain is §1231.
-- 'none' = land or other non-depreciable / non-recapture property.
--
-- The category gets a default; per-asset rows can override.
-- Until this block is run, the app falls back to a smart heuristic
-- (life ≥ 27 yrs ⇒ §1250, land ⇒ none, else ⇒ §1245) and hides the override UI.
alter table categories
  add column if not exists property_type text default '1245'
  check (property_type in ('1245','1250','none'));

alter table assets
  add column if not exists property_type text
  check (property_type in ('1245','1250','none'));

-- Note: prior depreciation already supported in this app via the
-- `prior_accum_dep` column on assets (see depreciation engine). No migration
-- needed for that feature.
