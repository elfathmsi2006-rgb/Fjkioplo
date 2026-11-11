-- Phase 1 control-center lifecycle support.
ALTER TABLE maintenance_tasks
  MODIFY status ENUM('PENDING','WAITING_PARTS','IN_PROGRESS','COMPLETED','CANCELLED') NOT NULL DEFAULT 'PENDING';

ALTER TABLE maintenance_tasks
  ADD COLUMN blocked_reason VARCHAR(500) NULL AFTER completed_at,
  ADD COLUMN escalated_at DATETIME NULL AFTER blocked_reason;