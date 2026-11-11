-- Email-only maintenance notification support.
-- Additive and repeat-safe: preserves existing notification history.
DELIMITER //
DROP PROCEDURE IF EXISTS cmms_add_recipient_email_column//
CREATE PROCEDURE cmms_add_recipient_email_column()
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'maintenance_notifications'
      AND COLUMN_NAME = 'recipient_email'
  ) THEN
    ALTER TABLE maintenance_notifications
      ADD COLUMN recipient_email VARCHAR(254) NULL
      AFTER recipient_phone;
  END IF;
END//
DELIMITER ;
CALL cmms_add_recipient_email_column();
DROP PROCEDURE IF EXISTS cmms_add_recipient_email_column;


-- Administrator-controlled switches for each automated email event.
CREATE TABLE IF NOT EXISTS maintenance_notification_settings (
  notification_type ENUM(
    'MACHINE_BREAKDOWN',
    'TASK_ASSIGNED',
    'TASK_REASSIGNED',
    'TASK_DUE_SOON',
    'TASK_DUE_TODAY',
    'TASK_OVERDUE'
  ) NOT NULL PRIMARY KEY,
  enabled TINYINT(1) NOT NULL DEFAULT 1,
  updated_by BIGINT UNSIGNED NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_notification_settings_user
    FOREIGN KEY (updated_by) REFERENCES users(id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO maintenance_notification_settings (notification_type, enabled)
VALUES
  ('MACHINE_BREAKDOWN', 1),
  ('TASK_ASSIGNED', 1),
  ('TASK_REASSIGNED', 1),
  ('TASK_DUE_SOON', 1),
  ('TASK_DUE_TODAY', 1),
  ('TASK_OVERDUE', 1)
ON DUPLICATE KEY UPDATE notification_type = VALUES(notification_type);
