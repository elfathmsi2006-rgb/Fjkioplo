-- Phase 1 control-center lifecycle support.
-- Additive and repeat-safe: no table is dropped, no data is deleted.
-- The status enum expansion is idempotent. The blocked_reason and escalated_at
-- columns are added only if they are absent (the target database may have been
-- created from a dump in which these columns already exist).
DELIMITER //
DROP PROCEDURE IF EXISTS cmms_add_control_column_if_missing//
CREATE PROCEDURE cmms_add_control_column_if_missing(IN p_column VARCHAR(64), IN p_definition TEXT)
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'maintenance_tasks' AND COLUMN_NAME = p_column
  ) THEN
    SET @cmms_ddl = CONCAT('ALTER TABLE `maintenance_tasks` ADD COLUMN `', REPLACE(p_column, '`', '``'), '` ', p_definition);
    PREPARE cmms_stmt FROM @cmms_ddl; EXECUTE cmms_stmt; DEALLOCATE PREPARE cmms_stmt;
  END IF;
END//
DELIMITER ;

ALTER TABLE maintenance_tasks
  MODIFY status ENUM('PENDING','WAITING_PARTS','IN_PROGRESS','COMPLETED','CANCELLED') NOT NULL DEFAULT 'PENDING';

CALL cmms_add_control_column_if_missing('blocked_reason', 'VARCHAR(500) NULL AFTER completed_at');
CALL cmms_add_control_column_if_missing('escalated_at', 'DATETIME NULL AFTER blocked_reason');

DELIMITER //
DROP PROCEDURE IF EXISTS cmms_add_control_column_if_missing//
DELIMITER ;
