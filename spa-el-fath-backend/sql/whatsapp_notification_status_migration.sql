-- Repeat-safe compatibility migration for older installations.
-- The supplied spa_el_fath schema already has provider_status/provider_status_at;
-- these checks avoid duplicate-column errors on that schema.
DELIMITER //
DROP PROCEDURE IF EXISTS cmms_add_notification_column_if_missing//
CREATE PROCEDURE cmms_add_notification_column_if_missing(IN p_column VARCHAR(64), IN p_definition TEXT)
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='maintenance_notifications' AND COLUMN_NAME=p_column
  ) THEN
    SET @cmms_ddl=CONCAT('ALTER TABLE `maintenance_notifications` ADD COLUMN `',REPLACE(p_column,'`','``'),'` ',p_definition);
    PREPARE cmms_stmt FROM @cmms_ddl; EXECUTE cmms_stmt; DEALLOCATE PREPARE cmms_stmt;
  END IF;
END//
DROP PROCEDURE IF EXISTS cmms_add_notification_index_if_missing//
CREATE PROCEDURE cmms_add_notification_index_if_missing()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='maintenance_notifications' AND INDEX_NAME='idx_notification_provider_message'
  ) THEN
    ALTER TABLE `maintenance_notifications` ADD INDEX `idx_notification_provider_message` (`provider_message_id`);
  END IF;
END//
DELIMITER ;
CALL cmms_add_notification_column_if_missing('provider_status','VARCHAR(30) DEFAULT NULL AFTER `provider_message_id`');
CALL cmms_add_notification_column_if_missing('provider_status_at','DATETIME DEFAULT NULL AFTER `provider_status`');
CALL cmms_add_notification_index_if_missing();
DELIMITER //
DROP PROCEDURE IF EXISTS cmms_add_notification_column_if_missing//
DROP PROCEDURE IF EXISTS cmms_add_notification_index_if_missing//
DELIMITER ;
