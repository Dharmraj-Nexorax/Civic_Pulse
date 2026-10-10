-- 003_indexes.sql (MySQL)

CREATE INDEX issues_org_status_idx   ON issues (organization_id, status);
CREATE INDEX issues_ward_cat_idx     ON issues (ward_id, category_id);
CREATE INDEX issues_worker_idx       ON issues (assigned_worker_id);
CREATE INDEX issues_team_idx         ON issues (assigned_team_id);
CREATE INDEX issues_geo_idx          ON issues (lat, lng);
CREATE INDEX complaints_issue_idx    ON complaints (issue_id);
CREATE INDEX complaints_citizen_idx  ON complaints (citizen_id, created_at);
CREATE INDEX assignments_worker_idx  ON assignments (worker_id);
CREATE INDEX assignments_issue_idx   ON assignments (issue_id);
CREATE INDEX resolutions_worker_idx  ON resolutions (worker_id);
CREATE INDEX resolutions_issue_idx   ON resolutions (issue_id);
CREATE INDEX events_issue_idx        ON issue_events (issue_id, created_at);
CREATE INDEX notif_user_idx          ON notifications (user_id, is_read, created_at);
