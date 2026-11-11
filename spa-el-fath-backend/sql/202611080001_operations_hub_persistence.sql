-- Operations Hub persistence: safety inspections, machine document metadata,
-- and technician operational profile fields. Apply after the base CMMS schema.
DELIMITER //
DROP PROCEDURE IF EXISTS cmms_add_technician_column_if_missing//
CREATE PROCEDURE cmms_add_technician_column_if_missing(IN p_column VARCHAR(64), IN p_definition TEXT)
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'technicians' AND COLUMN_NAME = p_column) THEN
    SET @cmms_ddl = CONCAT('ALTER TABLE `technicians` ADD COLUMN `', REPLACE(p_column, '`', '``'), '` ', p_definition);
    PREPARE cmms_stmt FROM @cmms_ddl; EXECUTE cmms_stmt; DEALLOCATE PREPARE cmms_stmt;
  END IF;
END//
DELIMITER ;
CALL cmms_add_technician_column_if_missing('skill', 'VARCHAR(160) NULL');
CALL cmms_add_technician_column_if_missing('shift_name', 'VARCHAR(80) NULL');
CALL cmms_add_technician_column_if_missing('attendance_status', 'ENUM(''present'',''absent'') NOT NULL DEFAULT ''present''');
CALL cmms_add_technician_column_if_missing('active', 'TINYINT(1) NOT NULL DEFAULT 1');
DROP PROCEDURE IF EXISTS cmms_add_technician_column_if_missing;

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
