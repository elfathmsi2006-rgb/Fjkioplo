-- Additive forward-only recovery for elements missing from the live database.
-- This file does NOT modify, reuse, or checksum-align any already-recorded migration.
-- Safe to apply after recovery reconciliation, with a prior backup. Idempotent and non-destructive.
-- Apply only after database backup and after the DBA/architect confirms target environment is staging/isolated or production-authorized.
DELIMITER //
DROP PROCEDURE IF EXISTS cmms_recovery_add_column_if_missing//
CREATE PROCEDURE cmms_recovery_add_column_if_missing(IN p_table VARCHAR(64), IN p_column VARCHAR(64), IN p_definition TEXT)
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = p_table AND COLUMN_NAME = p_column
  ) THEN
    SET @cmms_ddl = CONCAT('ALTER TABLE `', REPLACE(p_table, '`', '``'), '` ADD COLUMN `', REPLACE(p_column, '`', '``'), '` ', p_definition);
    PREPARE cmms_stmt FROM @cmms_ddl;
    EXECUTE cmms_stmt;
    DEALLOCATE PREPARE cmms_stmt;
  END IF;
END//
DELIMITER ;
CALL cmms_recovery_add_column_if_missing('users','token_version','INT UNSIGNED NOT NULL DEFAULT 0');
DROP PROCEDURE IF EXISTS cmms_recovery_add_column_if_missing;

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  token_hash CHAR(64) NOT NULL,
  expires_at DATETIME NOT NULL,
  used_at DATETIME NULL,
  request_ip VARCHAR(64) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_password_reset_token (token_hash),
  KEY idx_password_reset_user (user_id, expires_at),
  CONSTRAINT fk_password_reset_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS revoked_sessions (
  jti CHAR(36) NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  expires_at DATETIME NOT NULL,
  revoked_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reason VARCHAR(40) NOT NULL DEFAULT 'logout',
  PRIMARY KEY (jti),
  KEY idx_revoked_sessions_user (user_id, expires_at),
  KEY idx_revoked_sessions_expiry (expires_at),
  CONSTRAINT fk_revoked_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS cmms_hidden_failure_findings (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  fingerprint CHAR(64) NOT NULL,
  machine_id INT UNSIGNED NOT NULL,
  category VARCHAR(60) NOT NULL,
  finding_key VARCHAR(160) NOT NULL DEFAULT '',
  risk_level ENUM('CRITICAL','HIGH','MEDIUM','LOW') NOT NULL,
  risk_score TINYINT UNSIGNED NOT NULL,
  title VARCHAR(255) NOT NULL,
  explanation TEXT NULL,
  recommendation_code VARCHAR(60) NOT NULL,
  recommendation TEXT NULL,
  evidence JSON NULL,
  score_factors JSON NULL,
  window_days SMALLINT UNSIGNED NOT NULL DEFAULT 90,
  first_evidence_at DATETIME NULL,
  last_evidence_at DATETIME NULL,
  detected_at DATETIME NOT NULL,
  status ENUM('OPEN','ACKNOWLEDGED','REVIEW','RESOLVED') NOT NULL DEFAULT 'OPEN',
  note VARCHAR(1000) NULL,
  acknowledged_by BIGINT UNSIGNED NULL,
  acknowledged_at DATETIME NULL,
  reviewed_by BIGINT UNSIGNED NULL,
  reviewed_at DATETIME NULL,
  resolved_by BIGINT UNSIGNED NULL,
  resolved_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_hidden_failure_fingerprint (fingerprint),
  KEY idx_hidden_failure_machine (machine_id, status),
  KEY idx_hidden_failure_risk (status, risk_score),
  KEY idx_hidden_failure_category (category),
  CONSTRAINT fk_hidden_failure_machine FOREIGN KEY (machine_id) REFERENCES machines(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_hidden_failure_ack_user FOREIGN KEY (acknowledged_by) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_hidden_failure_review_user FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_hidden_failure_resolve_user FOREIGN KEY (resolved_by) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
