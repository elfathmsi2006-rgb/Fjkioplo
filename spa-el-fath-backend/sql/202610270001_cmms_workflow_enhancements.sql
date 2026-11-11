-- SPA EL FATH CMMS - additive, repeat-safe workflow compatibility migration.
-- Designed for both older installations and the supplied spa_el_fath MySQL 8 schema,
-- which already contains several of these columns/tables. BACK UP and test on a clone first.
-- Do not execute the schema-only dump as a migration.

DELIMITER //
DROP PROCEDURE IF EXISTS cmms_add_column_if_missing//
CREATE PROCEDURE cmms_add_column_if_missing(IN p_table VARCHAR(64), IN p_column VARCHAR(64), IN p_definition TEXT)
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = p_table AND COLUMN_NAME = p_column
  ) THEN
    SET @cmms_ddl = CONCAT('ALTER TABLE `', REPLACE(p_table, '`', '``'), '` ADD COLUMN `', REPLACE(p_column, '`', '``'), '` ', p_definition);
    PREPARE cmms_stmt FROM @cmms_ddl; EXECUTE cmms_stmt; DEALLOCATE PREPARE cmms_stmt;
  END IF;
END//
DROP PROCEDURE IF EXISTS cmms_add_index_if_missing//
CREATE PROCEDURE cmms_add_index_if_missing(IN p_table VARCHAR(64), IN p_index VARCHAR(64), IN p_definition TEXT)
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = p_table AND INDEX_NAME = p_index
  ) THEN
    SET @cmms_ddl = CONCAT('ALTER TABLE `', REPLACE(p_table, '`', '``'), '` ADD ', p_definition);
    PREPARE cmms_stmt FROM @cmms_ddl; EXECUTE cmms_stmt; DEALLOCATE PREPARE cmms_stmt;
  END IF;
END//
DROP PROCEDURE IF EXISTS cmms_add_fk_if_missing//
CREATE PROCEDURE cmms_add_fk_if_missing(IN p_table VARCHAR(64), IN p_constraint VARCHAR(64), IN p_definition TEXT)
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = p_table AND CONSTRAINT_NAME = p_constraint AND CONSTRAINT_TYPE = 'FOREIGN KEY'
  ) THEN
    SET @cmms_ddl = CONCAT('ALTER TABLE `', REPLACE(p_table, '`', '``'), '` ADD CONSTRAINT `', REPLACE(p_constraint, '`', '``'), '` ', p_definition);
    PREPARE cmms_stmt FROM @cmms_ddl; EXECUTE cmms_stmt; DEALLOCATE PREPARE cmms_stmt;
  END IF;
END//
DELIMITER ;

-- Machine fields: add only those absent from the target schema.
CALL cmms_add_column_if_missing('machines','name_fr','VARCHAR(50) NULL');
CALL cmms_add_column_if_missing('machines','name_en','VARCHAR(50) NULL');
CALL cmms_add_column_if_missing('machines','install_date','DATE NULL');
CALL cmms_add_column_if_missing('machines','next_maintenance_date','DATE NULL');
CALL cmms_add_column_if_missing('machines','technician_description','TEXT NULL');
CALL cmms_add_column_if_missing('machines','technician_description_updated_at','DATETIME NULL');
CALL cmms_add_column_if_missing('machines','workshop_chief_description','TEXT NULL');
CALL cmms_add_column_if_missing('machines','workshop_chief_description_updated_at','DATETIME NULL');

-- Maintenance history fields: add only absent columns, preserving existing records.
CALL cmms_add_column_if_missing('maintenance_logs','task_id','BIGINT UNSIGNED NULL');
CALL cmms_add_column_if_missing('maintenance_logs','maintenance_type','ENUM(''CORRECTIVE'',''PREVENTIVE'') NOT NULL DEFAULT ''CORRECTIVE''');
CALL cmms_add_column_if_missing('maintenance_logs','cost','DECIMAL(12,2) NOT NULL DEFAULT 0');
CALL cmms_add_column_if_missing('maintenance_logs','duration_hours','DECIMAL(8,2) NOT NULL DEFAULT 0');
CALL cmms_add_column_if_missing('maintenance_logs','problem_description','TEXT NULL');
CALL cmms_add_column_if_missing('maintenance_logs','work_performed','TEXT NULL');
CALL cmms_add_column_if_missing('maintenance_logs','diagnosis','TEXT NULL');
CALL cmms_add_column_if_missing('maintenance_logs','started_at','DATETIME NULL');
CALL cmms_add_column_if_missing('maintenance_logs','completed_at','DATETIME NULL');
CALL cmms_add_column_if_missing('maintenance_logs','downtime_start','DATETIME NULL');
CALL cmms_add_column_if_missing('maintenance_logs','downtime_end','DATETIME NULL');
CALL cmms_add_column_if_missing('maintenance_logs','submitted_at','DATETIME NULL');
CALL cmms_add_column_if_missing('maintenance_logs','submission_status','ENUM(''DRAFT'',''SUBMITTED'') NOT NULL DEFAULT ''SUBMITTED''');
CALL cmms_add_column_if_missing('maintenance_logs','idempotency_key','VARCHAR(100) NULL');
CALL cmms_add_column_if_missing('maintenance_logs','created_by_user_id','BIGINT UNSIGNED NULL');
CALL cmms_add_column_if_missing('maintenance_logs','updated_at','TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');
CALL cmms_add_index_if_missing('maintenance_logs','uq_maintenance_logs_idempotency','UNIQUE KEY `uq_maintenance_logs_idempotency` (`idempotency_key`)');
CALL cmms_add_index_if_missing('maintenance_logs','idx_maintenance_logs_task','KEY `idx_maintenance_logs_task` (`task_id`)');
CALL cmms_add_index_if_missing('maintenance_logs','idx_maintenance_logs_submission','KEY `idx_maintenance_logs_submission` (`submission_status`,`maintenance_date`)');
CALL cmms_add_fk_if_missing('maintenance_logs','fk_maintenance_logs_task','FOREIGN KEY (`task_id`) REFERENCES `maintenance_tasks` (`id`) ON DELETE SET NULL ON UPDATE CASCADE');
CALL cmms_add_fk_if_missing('maintenance_logs','fk_maintenance_logs_created_by','FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE');

DELIMITER //
DROP PROCEDURE IF EXISTS cmms_add_column_if_missing//
DROP PROCEDURE IF EXISTS cmms_add_index_if_missing//
DROP PROCEDURE IF EXISTS cmms_add_fk_if_missing//
DELIMITER ;

-- Existing installations keep their existing attachment/manual tables. These definitions
-- are created only when absent; they match the supplied MySQL schema.
CREATE TABLE IF NOT EXISTS maintenance_log_attachments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  maintenance_log_id BIGINT UNSIGNED NOT NULL,
  attachment_type ENUM('IMAGE','AUDIO') NOT NULL,
  original_filename VARCHAR(255) NOT NULL,
  storage_key VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  size_bytes BIGINT UNSIGNED NOT NULL,
  sha256 CHAR(64) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id), UNIQUE KEY uq_maintenance_attachment_storage_key (storage_key),
  KEY idx_maintenance_attachment_log_type (maintenance_log_id, attachment_type),
  CONSTRAINT fk_maintenance_attachment_log FOREIGN KEY (maintenance_log_id) REFERENCES maintenance_logs(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS machine_technical_manuals (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  machine_id INT UNSIGNED NOT NULL,
  title VARCHAR(200) NOT NULL,
  original_filename VARCHAR(255) NOT NULL,
  storage_key VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100) NOT NULL DEFAULT 'application/pdf',
  size_bytes BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id), UNIQUE KEY uq_machine_manual_storage_key (storage_key),
  KEY idx_machine_manual_machine (machine_id, created_at),
  CONSTRAINT fk_machine_manual_machine FOREIGN KEY (machine_id) REFERENCES machines(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
