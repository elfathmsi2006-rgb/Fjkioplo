-- Phase 6 scheduled maintenance Excel exports. Additive and repeat-safe.

CREATE TABLE IF NOT EXISTS cmms_maintenance_export_schedules (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  frequency ENUM('daily','weekly','monthly') NOT NULL DEFAULT 'daily',
  export_time VARCHAR(8) NOT NULL DEFAULT '02:00',
  timezone VARCHAR(64) NOT NULL DEFAULT 'Africa/Algiers',
  enabled TINYINT(1) NOT NULL DEFAULT 1,
  last_run_at DATETIME NULL,
  last_status ENUM('IDLE','SUCCESS','FAILED') NOT NULL DEFAULT 'IDLE',
  retention_days INT UNSIGNED NOT NULL DEFAULT 30,
  created_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_cmms_export_schedules_enabled (enabled, frequency, last_run_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS cmms_maintenance_export_executions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  schedule_id INT UNSIGNED NULL,
  status ENUM('RUNNING','SUCCESS','FAILED') NOT NULL DEFAULT 'RUNNING',
  filename VARCHAR(255) NOT NULL,
  file_size BIGINT UNSIGNED NULL,
  record_count INT UNSIGNED NULL,
  error_message TEXT NULL,
  triggered_by ENUM('SCHEDULER','MANUAL') NOT NULL DEFAULT 'SCHEDULER',
  started_at DATETIME NOT NULL,
  finished_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_cmms_export_executions_schedule (schedule_id, status, started_at DESC),
  KEY idx_cmms_export_executions_status (status, started_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
