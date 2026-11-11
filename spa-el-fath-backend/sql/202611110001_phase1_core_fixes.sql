-- Phase 1 core fixes. Additive and repeat-safe: no table or row is dropped.
-- 1) users.token_version enables server-side session invalidation after a password change.
-- 2) password_reset_tokens stores only SHA-256 hashes of single-use, expiring reset tokens.
-- 3) Schema parity for structures that were only present in later migrations:
--    user_preferences, cmms_safety_inspections, cmms_machine_documents.
-- 4) Technician operational profile columns required by the technicians API.

DELIMITER //
DROP PROCEDURE IF EXISTS cmms_add_column_if_missing//
CREATE PROCEDURE cmms_add_column_if_missing(IN p_table VARCHAR(64), IN p_column VARCHAR(64), IN p_definition TEXT)
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = p_table AND COLUMN_NAME = p_column) THEN
    SET @cmms_ddl = CONCAT('ALTER TABLE `', REPLACE(p_table, '`', '``'), '` ADD COLUMN `', REPLACE(p_column, '`', '``'), '` ', p_definition);
    PREPARE cmms_stmt FROM @cmms_ddl; EXECUTE cmms_stmt; DEALLOCATE PREPARE cmms_stmt;
  END IF;
END//
DELIMITER ;

CALL cmms_add_column_if_missing('users','token_version','INT UNSIGNED NOT NULL DEFAULT 0');

CALL cmms_add_column_if_missing('technicians','skill','VARCHAR(160) NULL');
CALL cmms_add_column_if_missing('technicians','shift_name','VARCHAR(80) NULL');
CALL cmms_add_column_if_missing('technicians','attendance_status','ENUM(''present'',''absent'') NOT NULL DEFAULT ''present''');
CALL cmms_add_column_if_missing('technicians','active','TINYINT(1) NOT NULL DEFAULT 1');

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

CREATE TABLE IF NOT EXISTS cmms_safety_inspections (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  machine_id INT UNSIGNED NULL,
  inspection_date DATE NOT NULL,
  inspector VARCHAR(160) NULL,
  result ENUM('COMPLIANT','OBSERVATION','HAZARD') NOT NULL DEFAULT 'OBSERVATION',
  notes TEXT NULL,
  created_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_safety_date (inspection_date), KEY idx_safety_machine (machine_id),
  CONSTRAINT fk_safety_machine FOREIGN KEY (machine_id) REFERENCES machines(id) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_safety_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS cmms_machine_documents (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  machine_id INT UNSIGNED NULL,
  document_type VARCHAR(80) NOT NULL DEFAULT 'OTHER',
  reference_code VARCHAR(120) NULL,
  file_location VARCHAR(1000) NULL,
  notes TEXT NULL,
  created_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_machine_docs_machine (machine_id),
  CONSTRAINT fk_machine_docs_machine FOREIGN KEY (machine_id) REFERENCES machines(id) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_machine_docs_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_preferences (
  user_id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
  language ENUM('ar','fr','en') NOT NULL DEFAULT 'ar',
  theme ENUM('light','dark','system') NOT NULL DEFAULT 'system',
  accent ENUM('blue','teal','violet','amber') NOT NULL DEFAULT 'blue',
  density ENUM('comfortable','compact') NOT NULL DEFAULT 'comfortable',
  alert_preferences JSON NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_user_preferences_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP PROCEDURE IF EXISTS cmms_add_column_if_missing;
