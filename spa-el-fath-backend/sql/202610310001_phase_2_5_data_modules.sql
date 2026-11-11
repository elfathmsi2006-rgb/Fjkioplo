-- Additive CMMS modules. Reuse the existing warehouse_parts, warehouse_movements, production_records, and audit_trail tables.
-- This migration intentionally does not create parallel inventory, production, or audit tables.
-- Review and back up the target database before applying. No existing table is altered.



CREATE TABLE IF NOT EXISTS cmms_preventive_plans (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  machine_id INT UNSIGNED NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT NULL,
  frequency_days SMALLINT UNSIGNED NOT NULL,
  last_completed_at DATETIME NULL,
  next_due_at DATETIME NOT NULL,
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_cmms_preventive_due (active, next_due_at),
  KEY idx_cmms_preventive_machine (machine_id),
  CONSTRAINT fk_cmms_preventive_machine FOREIGN KEY (machine_id) REFERENCES machines(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_cmms_preventive_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

