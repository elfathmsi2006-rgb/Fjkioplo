-- Additive, repeat-safe workshop details migration. Back up and test before production.
DELIMITER //
DROP PROCEDURE IF EXISTS cmms_add_workshop_column_if_missing//
CREATE PROCEDURE cmms_add_workshop_column_if_missing(IN p_column VARCHAR(64), IN p_definition TEXT)
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'workshops' AND COLUMN_NAME = p_column) THEN
    SET @cmms_ddl = CONCAT('ALTER TABLE `workshops` ADD COLUMN `', REPLACE(p_column, '`', '``'), '` ', p_definition);
    PREPARE cmms_stmt FROM @cmms_ddl; EXECUTE cmms_stmt; DEALLOCATE PREPARE cmms_stmt;
  END IF;
END//
DELIMITER ;
ALTER TABLE workshops MODIFY COLUMN name VARCHAR(50) NULL;
CALL cmms_add_workshop_column_if_missing('name_fr', 'VARCHAR(150) NULL');
CALL cmms_add_workshop_column_if_missing('name_en', 'VARCHAR(150) NULL');
CALL cmms_add_workshop_column_if_missing('manager', 'VARCHAR(150) NULL');
CALL cmms_add_workshop_column_if_missing('manager_phone', 'VARCHAR(30) NULL');
CALL cmms_add_workshop_column_if_missing('location', 'VARCHAR(200) NULL');
UPDATE workshops SET name_fr = COALESCE(name_fr, name), name_en = COALESCE(name_en, name);
DROP PROCEDURE IF EXISTS cmms_add_workshop_column_if_missing;
