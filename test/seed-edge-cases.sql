-- ============================================================
-- Stress-test seed data — every weird, edge, and fake-data case the app
-- should handle without falling over. Paste into Supabase Studio → SQL
-- Editor → Run AFTER you've loaded the entity + category seed blocks.
--
-- Safe to wipe with the standard delete-from-all-tables block.
-- ============================================================

-- Helper: pick the most-used entity for assignment (fallback to first)
do $$
declare
  v_entity uuid;
  v_cat_recip uuid; v_cat_horse uuid; v_cat_truck uuid; v_cat_heavy uuid;
  v_cat_tools uuid; v_cat_office uuid; v_cat_furn uuid; v_cat_breed uuid;
  v_cat_bldg uuid; v_cat_apt uuid; v_cat_ag uuid; v_cat_landimp uuid;
  v_cat_land uuid; v_cat_specialag uuid;
begin
  select id into v_entity from entities where entity_type='parent' and name like '%Solo Select Properties%' limit 1;
  if v_entity is null then select id into v_entity from entities limit 1; end if;

  select id into v_cat_recip from categories where name ilike '%mares%' limit 1;
  select id into v_cat_horse from categories where name ilike '%older horses%' limit 1;
  select id into v_cat_truck from categories where name ilike '%trucks%' limit 1;
  select id into v_cat_heavy from categories where name ilike '%heavy equipment%' limit 1;
  select id into v_cat_tools from categories where name ilike '%tools%' limit 1;
  select id into v_cat_office from categories where name ilike '%office%' limit 1;
  select id into v_cat_furn   from categories where name ilike '%furniture%' limit 1;
  select id into v_cat_breed  from categories where name ilike '%breeding%' limit 1;
  select id into v_cat_bldg   from categories where name ilike '%nonresidential%' limit 1;
  select id into v_cat_apt    from categories where name ilike '%residential%' limit 1;
  select id into v_cat_ag     from categories where name ilike '%ag fencing%' limit 1;
  select id into v_cat_landimp from categories where name ilike '%land improvements%' limit 1;
  select id into v_cat_land   from categories where name ilike '%land (not%' limit 1;
  select id into v_cat_specialag from categories where name ilike '%single-purpose%' limit 1;

  -- ============================================================
  -- 1. NORMAL CASES — typical assets across every category
  -- ============================================================
  insert into assets (description, asset_number, category_id, entity_id, in_service_date,
    cost, salvage_value, section_179, method, life_years, convention, bonus_pct, status,
    pool_type, ownership_pct, location, vendor) values
    ('Ford F-250 ranch truck', 'TRK-001', v_cat_truck, v_entity, '2024-05-15', 65000, 0, 0, 'ddb', 5, 'half_year', 0, 'active', null, 100, 'Main barn', 'Ford'),
    ('John Deere 6155R tractor', 'EQ-001', v_cat_heavy, v_entity, '2023-03-20', 145000, 5000, 0, 'ddb', 7, 'half_year', 60, 'active', null, 100, 'Equipment shed', 'John Deere'),
    ('Polaris Ranger UTV', 'EQ-002', v_cat_heavy, v_entity, '2024-08-12', 28500, 0, 28500, 'ddb', 7, 'half_year', 0, 'active', null, 100, 'North pasture', 'Polaris'),
    ('Kubota mini-excavator', 'EQ-003', v_cat_heavy, v_entity, '2025-02-10', 48000, 0, 0, 'ddb', 7, 'half_year', 100, 'active', null, 100, 'Equipment shed', 'Kubota'),
    ('Welding rig + generator', 'TOOL-001', v_cat_tools, v_entity, '2024-11-05', 8500, 0, 0, 'ddb', 7, 'half_year', 0, 'active', null, 100, 'Workshop', 'Lincoln Electric'),
    ('Office computer (Dell)', 'COMP-001', v_cat_office, v_entity, '2025-01-15', 2200, 0, 0, 'ddb', 5, 'half_year', 0, 'active', null, 100, 'Office', 'Dell'),
    ('Conference table + chairs', 'FURN-001', v_cat_furn, v_entity, '2023-07-01', 4800, 0, 0, 'ddb', 7, 'half_year', 0, 'active', null, 100, 'Office', 'Wayfair'),
    ('30x40 metal barn', 'BLD-001', v_cat_bldg, v_entity, '2022-04-01', 185000, 0, 0, 'sl', 39, 'mid_month', 0, 'active', null, 100, '4707 FM 3164', 'Mueller Buildings'),
    ('Foaling barn (specialized)', 'BLD-002', v_cat_specialag, v_entity, '2024-01-15', 425000, 0, 0, 'ddb', 10, 'half_year', 80, 'active', null, 100, '5585 FM 902', 'Custom build'),
    ('Property fencing — 1 mile', 'FENCE-001', v_cat_ag, v_entity, '2023-09-01', 35000, 0, 0, 'ddb', 7, 'half_year', 0, 'active', null, 100, 'Perimeter', 'Stay-Tuff'),
    ('Driveway resurfacing', 'IMP-001', v_cat_landimp, v_entity, '2024-06-01', 18000, 0, 0, 'ddb', 15, 'half_year', 0, 'active', null, 100, 'Main entrance', 'Texas Asphalt');

  -- ============================================================
  -- 2. RECIP MARES — pool_type='recip_mare', bucket assignments
  -- ============================================================
  insert into assets (description, asset_number, category_id, entity_id, in_service_date,
    cost, method, life_years, convention, bonus_pct, status,
    pool_type, bucket_tag, ownership_pct, foaling_year, color, sex, sire, dam) values
    ('Recip Mare #1 — Bay', 'RM-001', v_cat_recip, v_entity, '2024-04-15', 8500, 'ddb', 7, 'half_year', 0, 'active', 'recip_mare', 'Solo Horses', 100, 2018, 'Bay', 'm', 'Unknown', 'Unknown'),
    ('Recip Mare #2 — Chestnut', 'RM-002', v_cat_recip, v_entity, '2024-04-15', 7800, 'ddb', 7, 'half_year', 0, 'active', 'recip_mare', 'Solo Horses', 100, 2017, 'Chestnut', 'm', 'Unknown', 'Unknown'),
    ('Recip Mare #3 — Gray (Graves)', 'RM-003', v_cat_recip, v_entity, '2025-01-10', 12000, 'ddb', 7, 'half_year', 100, 'active', 'recip_mare', 'Graves Purchase', 100, 2020, 'Gray', 'm', 'Unknown', 'Unknown'),
    ('Recip Mare #4 — Sorrel', 'RM-004', v_cat_recip, v_entity, '2025-03-22', 9200, 'ddb', 7, 'half_year', 0, 'active', 'recip_mare', 'Repro', 100, 2019, 'Sorrel', 'm', 'Unknown', 'Unknown');

  -- ============================================================
  -- 3. TRADING HORSES — pool_type='trading', some inventory, some capitalized
  -- ============================================================
  insert into assets (description, asset_number, category_id, entity_id, in_service_date,
    cost, method, life_years, convention, status, pool_type, ownership_pct, is_inventory,
    foaling_year, color, sex, sire, dam) values
    ('Lot 47 — Bay Filly (inventory)', 'TRD-001', v_cat_horse, v_entity, '2024-09-01', 35000, 'sl', 7, 'half_year', 'active', 'trading', 100, true, 2024, 'Bay', 'f', 'Stallion A', 'Mare X'),
    ('Lot 52 — Sorrel Colt (inventory)', 'TRD-002', v_cat_horse, v_entity, '2024-09-01', 28000, 'sl', 7, 'half_year', 'active', 'trading', 100, true, 2024, 'Sorrel', 'c', 'Stallion B', 'Mare Y'),
    ('Stallion shares — Famous Stud', 'TRD-003', v_cat_breed, v_entity, '2023-05-01', 175000, 'ddb', 7, 'half_year', 'active', 'trading', 25, false, 2018, 'Bay', 's', 'Famous Sire', 'Champion Dam');

  -- ============================================================
  -- 4. PROPERTIES — pool_type='property' with property_group, land + bldg + improvements
  -- ============================================================
  insert into assets (description, asset_number, category_id, entity_id, in_service_date,
    cost, improvements_cost, land_value, prior_accum_dep, method, life_years, convention,
    status, pool_type, property_group, is_land, ownership_pct) values
    ('Land — 4707 FM 3164', null, v_cat_land, v_entity, '2022-01-01',  85000, 0, 0, 0,
      'sl', 0.5, 'half_year', 'active', 'property', '4707 FM 3164', true, 100),
    ('Building — 4707 FM 3164', null, v_cat_apt, v_entity, '2022-01-01', 320000, 25000, 0, 18500,
      'sl', 27.5, 'mid_month', 'active', 'property', '4707 FM 3164', false, 100),

    ('Land — 916 N Morris', null, v_cat_land, v_entity, '2025-05-29', 45000, 0, 0, 0,
      'sl', 0.5, 'half_year', 'active', 'property', '916 N Morris', true, 100),
    ('House — 916 N Morris', null, v_cat_apt, v_entity, '2025-05-29', 215000, 0, 0, 0,
      'sl', 27.5, 'mid_month', 'active', 'property', '916 N Morris', false, 100),
    ('HVAC replacement — 916 N Morris', null, v_cat_bldg, v_entity, '2025-08-15', 14500, 0, 0, 0,
      'ddb', 7, 'half_year', 'active', 'property', '916 N Morris', false, 100),

    ('Land — Stephenville RV Park', null, v_cat_land, v_entity, '2022-11-25', 220000, 0, 0, 0,
      'sl', 0.5, 'half_year', 'active', 'property', 'Stephenville RV Park', true, 100),
    ('RV pads + utilities', null, v_cat_landimp, v_entity, '2022-11-25', 380000, 65000, 0, 88000,
      'ddb', 15, 'half_year', 'active', 'property', 'Stephenville RV Park', false, 100),
    ('Office trailer', null, v_cat_bldg, v_entity, '2023-02-01', 25000, 0, 0, 0,
      'sl', 39, 'mid_month', 'active', 'property', 'Stephenville RV Park', false, 100);

  -- ============================================================
  -- 5. WEIRD / EDGE CASES — engine and UI stress
  -- ============================================================
  insert into assets (description, category_id, entity_id, in_service_date, cost, salvage_value,
    section_179, bonus_pct, method, life_years, convention, status, pool_type, prior_accum_dep,
    is_land, is_inventory, ownership_pct, notes) values

    -- $1 asset (smallest non-zero cost)
    ('TINY — One dollar pen',         v_cat_office, v_entity, '2025-01-01',         1, 0, 0, 0,   'sl',  5,    'half_year', 'active', null,  0, false, false, 100, 'Engine should not divide by zero'),

    -- Very large cost
    ('HUGE — Custom indoor arena',    v_cat_specialag, v_entity, '2024-06-01', 12500000, 0, 0, 0, 'ddb', 10,   'half_year', 'active', null,  0, false, false, 100, 'Eight-figure cost — UI overflow check'),

    -- Special characters in description (apostrophe, ampersand, emoji, quotes)
    ('Murphy''s "Lucky" stallion & co. 🐴', v_cat_breed, v_entity, '2024-01-01',  85000, 0, 0, 0, 'ddb', 7,    'half_year', 'active', null,  0, false, false, 100, 'Tests SQL escaping & UI rendering'),

    -- Bonus 100% — fully expensed year 1
    ('100%-bonus equipment',          v_cat_heavy, v_entity, '2025-04-01',     22000, 0, 0,100,   'bonus', 7, 'half_year', 'active', null,  0, false, false, 100, 'Fully expensed first year'),

    -- §179 maxed at full cost
    ('§179 maxed asset',              v_cat_truck, v_entity, '2025-03-15',     35000, 0, 35000, 0,'ddb', 5,    'half_year', 'active', null,  0, false, false, 100, '§179 = entire cost'),

    -- Salvage very close to cost
    ('Tiny depreciable basis',        v_cat_furn, v_entity, '2025-01-15',      10000, 9500, 0, 0,'sl',  7,    'half_year', 'active', null,  0, false, false, 100, 'Basis after salvage = $500'),

    -- Asset in service decades ago (fully depreciated)
    ('1995 grain silo — fully depreciated', v_cat_specialag, v_entity, '1995-01-01', 80000, 0, 0, 0, 'sl', 10, 'half_year', 'active', null, 0, false, false, 100, 'In service 30+ years ago'),

    -- Future-dated in service (data-entry edge)
    ('Future asset (2027)',           v_cat_office, v_entity, '2027-01-01',      1500, 0, 0, 0,   'sl',  5,    'half_year', 'active', null,  0, false, false, 100, 'Placed in service in the future'),

    -- prior_accum_dep > what would be depreciated yet
    ('Imported with overdone prior dep', v_cat_recip, v_entity, '2023-01-01', 15000, 0, 0, 0,   'ddb', 7,   'half_year', 'active', null, 18000, false, false, 100, 'Prior accum exceeds depreciable basis'),

    -- Mid-quarter convention (rarer)
    ('Q4 mid-quarter equipment',      v_cat_heavy, v_entity, '2024-11-15',     30000, 0, 0, 0,   'ddb', 7,    'mid_quarter', 'active', null, 0, false, false, 100, 'Tests mid-quarter math'),

    -- Land improvement with 15-yr life (§1245)
    ('Pasture irrigation system',     v_cat_landimp, v_entity, '2024-04-01',  45000, 0, 0, 0,   'ddb', 15,   'half_year', 'active', null,  0, false, false, 100, '15-yr land improvement'),

    -- Long description (UI overflow check)
    (rpad('Very long description for UI overflow check ', 300, 'X'),
                                       v_cat_office, v_entity, '2025-02-01',   500, 0, 0, 0, 'sl', 5, 'half_year', 'active', null, 0, false, false, 100, 'Description is 300+ chars'),

    -- Explicit zero cost (would normally be invalid via UI but might leak in)
    ('Donated zero-cost item',        v_cat_furn, v_entity, '2025-06-01',         0, 0, 0, 0,   'sl',  7,    'half_year', 'active', null,  0, false, false, 100, 'Zero-cost edge')
  ;

  -- ============================================================
  -- 6. DISPOSALS — verify the dispose flow + Form 4797 across cases
  -- ============================================================

  -- Build a small disposal set against assets we just inserted.
  -- (Mark some as disposed, then add disposals rows referencing them.)
  -- a) §1245 gain entirely under accum dep
  with a as (
    insert into assets (description, category_id, entity_id, in_service_date, cost, method,
      life_years, convention, status, pool_type, ownership_pct)
    values ('DISPOSED — 5yr SL truck (small gain)', v_cat_truck, v_entity, '2020-01-01',
            10000, 'sl', 5, 'half_year', 'disposed', null, 100)
    returning id
  )
  insert into disposals (asset_id, disposal_date, disposal_type, proceeds, buyer, notes, created_by)
  select a.id, '2025-06-15', 'sold', 6000, 'Bob the buyer', '§1245 gain ≤ accum dep — all ordinary', 'seed' from a;

  -- b) §1245 gain that exceeds original cost (rare for vehicles, common for collectibles)
  with a as (
    insert into assets (description, category_id, entity_id, in_service_date, cost, method,
      life_years, convention, status, pool_type, ownership_pct)
    values ('DISPOSED — Stallion (sold above cost)', v_cat_breed, v_entity, '2020-01-01',
            50000, 'ddb', 7, 'half_year', 'disposed', null, 100)
    returning id
  )
  insert into disposals (asset_id, disposal_date, disposal_type, proceeds, buyer, notes, created_by)
  select a.id, '2025-04-01', 'sold', 200000, 'Auction buyer', '§1245 + §1231 split — sold above cost', 'seed' from a;

  -- c) Loss case (proceeds < tax basis)
  with a as (
    insert into assets (description, category_id, entity_id, in_service_date, cost, method,
      life_years, convention, status, pool_type, ownership_pct)
    values ('DISPOSED — Old equipment (loss)', v_cat_heavy, v_entity, '2023-01-01',
            40000, 'ddb', 7, 'half_year', 'disposed', null, 100)
    returning id
  )
  insert into disposals (asset_id, disposal_date, disposal_type, proceeds, buyer, notes, created_by)
  select a.id, '2025-08-01', 'sold', 8000, 'Salvage yard', '§1231 loss', 'seed' from a;

  -- d) Scrapped (zero proceeds)
  with a as (
    insert into assets (description, category_id, entity_id, in_service_date, cost, method,
      life_years, convention, status, pool_type, ownership_pct)
    values ('DISPOSED — Damaged tractor (scrapped)', v_cat_heavy, v_entity, '2022-01-01',
            85000, 'ddb', 7, 'half_year', 'disposed', null, 100)
    returning id
  )
  insert into disposals (asset_id, disposal_date, disposal_type, proceeds, buyer, notes, created_by)
  select a.id, '2025-09-01', 'scrapped', 0, null, 'Total loss in field accident', 'seed' from a;

  -- e) §1250 building disposal
  with a as (
    insert into assets (description, category_id, entity_id, in_service_date, cost, method,
      life_years, convention, status, pool_type, property_group, ownership_pct)
    values ('DISPOSED — Old shed (sold)', v_cat_bldg, v_entity, '2010-01-01',
            45000, 'sl', 39, 'mid_month', 'disposed', 'property', 'Old Property', 100)
    returning id
  )
  insert into disposals (asset_id, disposal_date, disposal_type, proceeds, buyer, notes, created_by)
  select a.id, '2025-07-15', 'sold', 90000, 'Local farmer', '§1250 building — gain → §1231', 'seed' from a;

end $$;

-- Verify
select 'TOTAL assets'   as label, count(*) from assets
union all select 'TOTAL active', count(*) from assets where status='active'
union all select 'TOTAL disposed', count(*) from assets where status='disposed'
union all select 'TOTAL disposals rows', count(*) from disposals
union all select 'pool=property', count(*) from assets where pool_type='property'
union all select 'pool=recip_mare', count(*) from assets where pool_type='recip_mare'
union all select 'pool=trading', count(*) from assets where pool_type='trading'
union all select 'is_inventory', count(*) from assets where is_inventory=true
union all select 'is_land', count(*) from assets where is_land=true;
