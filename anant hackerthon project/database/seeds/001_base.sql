-- 001_base.sql (MySQL)
-- Base seed for CivicPulse (idempotent)

-- 1. Organization
INSERT INTO organizations (id, slug, name, type)
VALUES ('00000000-0000-0000-0000-000000000001', 'demo-panchayat', 'Demo Panchayat', 'NAGAR_PANCHAYAT')
ON DUPLICATE KEY UPDATE name = VALUES(name), type = VALUES(type);

-- 2. Teams
INSERT INTO teams (id, organization_id, name, is_active)
VALUES
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Water Team', 1),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Road Maintenance Team', 1),
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'Sanitation Team', 1),
  ('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'Streetlight Team', 1)
ON DUPLICATE KEY UPDATE is_active = VALUES(is_active);

-- 3. Categories
INSERT INTO categories (id, organization_id, `key`, name, category_score, default_team_id, keywords, is_active)
VALUES
  (
    '20000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'public_safety',
    'Public Safety / Dangerous Infrastructure',
    20,
    NULL,
    JSON_ARRAY('collapsed', 'dangerous', 'unsafe', 'exposed wire', 'open manhole'),
    1
  ),
  (
    '20000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000001',
    'water_supply',
    'Water Supply',
    18,
    '10000000-0000-0000-0000-000000000001',
    JSON_ARRAY('water', 'pipeline', 'leak', 'leakage', 'tap', 'paani', 'pani', 'nal', 'jal'),
    1
  ),
  (
    '20000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000001',
    'sanitation_sewage',
    'Sanitation / Sewage',
    18,
    '10000000-0000-0000-0000-000000000003',
    JSON_ARRAY('sewage', 'sewer', 'drain', 'drainage', 'naali', 'nali', 'overflow'),
    1
  ),
  (
    '20000000-0000-0000-0000-000000000004',
    '00000000-0000-0000-0000-000000000001',
    'road_damage',
    'Roads (damage)',
    18,
    '10000000-0000-0000-0000-000000000002',
    JSON_ARRAY('road', 'pothole', 'broken road', 'sadak', 'gaddha'),
    1
  ),
  (
    '20000000-0000-0000-0000-000000000005',
    '00000000-0000-0000-0000-000000000001',
    'streetlight',
    'Streetlight / Electricity',
    15,
    '10000000-0000-0000-0000-000000000004',
    JSON_ARRAY('streetlight', 'street light', 'lamp', 'light pole', 'bijli', 'batti'),
    1
  ),
  (
    '20000000-0000-0000-0000-000000000006',
    '00000000-0000-0000-0000-000000000001',
    'garbage_waste',
    'Garbage / Waste',
    12,
    '10000000-0000-0000-0000-000000000003',
    JSON_ARRAY('garbage', 'waste', 'trash', 'dustbin', 'kachra', 'kooda'),
    1
  ),
  (
    '20000000-0000-0000-0000-000000000007',
    '00000000-0000-0000-0000-000000000001',
    'minor_maintenance',
    'Minor Maintenance',
    8,
    NULL,
    JSON_ARRAY(),
    1
  ),
  (
    '20000000-0000-0000-0000-000000000008',
    '00000000-0000-0000-0000-000000000001',
    'other',
    'Other',
    5,
    NULL,
    JSON_ARRAY(),
    1
  )
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  category_score = VALUES(category_score),
  default_team_id = VALUES(default_team_id),
  keywords = VALUES(keywords),
  is_active = VALUES(is_active);

-- 4. Organization Settings
INSERT INTO org_settings (organization_id, `key`, `value`)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'sla_hours.CRITICAL', CAST('48' AS JSON)),
  ('00000000-0000-0000-0000-000000000001', 'sla_hours.HIGH', CAST('96' AS JSON)),
  ('00000000-0000-0000-0000-000000000001', 'sla_hours.MEDIUM', CAST('168' AS JSON)),
  ('00000000-0000-0000-0000-000000000001', 'sla_hours.LOW', CAST('240' AS JSON)),
  ('00000000-0000-0000-0000-000000000001', 'start_work_window_hours', CAST('24' AS JSON)),
  ('00000000-0000-0000-0000-000000000001', 'similar_radius_m', CAST('500' AS JSON)),
  ('00000000-0000-0000-0000-000000000001', 'similarity_threshold', CAST('0.60' AS JSON)),
  ('00000000-0000-0000-0000-000000000001', 'hotspot_default_days', CAST('90' AS JSON)),
  ('00000000-0000-0000-0000-000000000001', 'alert.worker_overload_factor', CAST('1.5' AS JSON)),
  ('00000000-0000-0000-0000-000000000001', 'alert.worker_overload_min_active', CAST('3' AS JSON)),
  ('00000000-0000-0000-0000-000000000001', 'alert.reopen_rate_pct', CAST('20' AS JSON)),
  ('00000000-0000-0000-0000-000000000001', 'alert.reopen_min_resolutions', CAST('5' AS JSON)),
  ('00000000-0000-0000-0000-000000000001', 'alert.ward_surge_factor', CAST('1.5' AS JSON)),
  ('00000000-0000-0000-0000-000000000001', 'alert.ward_surge_min_reports', CAST('5' AS JSON))
ON DUPLICATE KEY UPDATE `value` = VALUES(`value`);
