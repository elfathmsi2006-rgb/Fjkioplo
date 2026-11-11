-- SPA EL FATH CMMS maintenance suite expansion (additive only).
-- Back up and test against a disposable schema before production use.
CREATE TABLE IF NOT EXISTS cmms_pm_occurrences (
 id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
 plan_id BIGINT UNSIGNED NOT NULL,
 due_at DATETIME NOT NULL,
 task_id BIGINT UNSIGNED NULL,
 occurrence_status ENUM('GENERATED','SKIPPED') NOT NULL DEFAULT 'GENERATED',
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE KEY uq_cmms_pm_occurrence (plan_id,due_at),
 KEY idx_cmms_pm_occurrence_task (task_id),
 CONSTRAINT fk_cmms_pm_occurrence_plan FOREIGN KEY (plan_id) REFERENCES cmms_preventive_plans(id) ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT fk_cmms_pm_occurrence_task FOREIGN KEY (task_id) REFERENCES maintenance_tasks(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS cmms_pm_checklist_items (
 id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
 plan_id BIGINT UNSIGNED NOT NULL,
 title VARCHAR(200) NOT NULL,
 required TINYINT(1) NOT NULL DEFAULT 1,
 unit VARCHAR(40) NULL,
 minimum_value DECIMAL(14,4) NULL,
 maximum_value DECIMAL(14,4) NULL,
 sort_order INT NOT NULL DEFAULT 0,
 active TINYINT(1) NOT NULL DEFAULT 1,
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 KEY idx_cmms_pm_checklist_plan (plan_id,active,sort_order),
 CONSTRAINT fk_cmms_pm_checklist_plan FOREIGN KEY (plan_id) REFERENCES cmms_preventive_plans(id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS cmms_work_order_checklist_results (
 id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
 task_id BIGINT UNSIGNED NOT NULL,
 checklist_item_id BIGINT UNSIGNED NOT NULL,
 result ENUM('PASS','FAIL','NA') NOT NULL,
 measured_value DECIMAL(14,4) NULL,
 notes VARCHAR(2000) NULL,
 completed_by BIGINT UNSIGNED NULL,
 completed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE KEY uq_cmms_task_checklist_result (task_id,checklist_item_id),
 KEY idx_cmms_checklist_task (task_id),
 CONSTRAINT fk_cmms_checklist_result_task FOREIGN KEY (task_id) REFERENCES maintenance_tasks(id) ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT fk_cmms_checklist_result_item FOREIGN KEY (checklist_item_id) REFERENCES cmms_pm_checklist_items(id) ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT fk_cmms_checklist_result_user FOREIGN KEY (completed_by) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS cmms_machine_meter_readings (
 id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
 machine_id INT UNSIGNED NOT NULL,
 meter_type ENUM('OPERATING_HOURS','CYCLES','PRODUCTION_UNITS') NOT NULL,
 reading_value DECIMAL(18,3) NOT NULL,
 reading_at DATETIME NOT NULL,
 source VARCHAR(120) NOT NULL,
 notes VARCHAR(1000) NULL,
 recorded_by BIGINT UNSIGNED NULL,
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 KEY idx_cmms_meter_machine_type_date (machine_id,meter_type,reading_at),
 CONSTRAINT fk_cmms_meter_machine FOREIGN KEY (machine_id) REFERENCES machines(id) ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT fk_cmms_meter_user FOREIGN KEY (recorded_by) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS cmms_condition_readings (
 id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
 machine_id INT UNSIGNED NOT NULL,
 metric ENUM('TEMPERATURE','VIBRATION','NOISE','ENERGY','OTHER') NOT NULL,
 value_num DECIMAL(18,5) NOT NULL,
 unit VARCHAR(40) NOT NULL,
 measured_at DATETIME NOT NULL,
 source VARCHAR(120) NOT NULL,
 threshold_min DECIMAL(18,5) NULL,
 threshold_max DECIMAL(18,5) NULL,
 notes VARCHAR(1000) NULL,
 recorded_by BIGINT UNSIGNED NULL,
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 KEY idx_cmms_condition_machine_date (machine_id,measured_at),
 KEY idx_cmms_condition_metric (metric,measured_at),
 CONSTRAINT fk_cmms_condition_machine FOREIGN KEY (machine_id) REFERENCES machines(id) ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT fk_cmms_condition_user FOREIGN KEY (recorded_by) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS cmms_work_order_parts (
 id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
 task_id BIGINT UNSIGNED NOT NULL,
 part_id BIGINT UNSIGNED NOT NULL,
 quantity DECIMAL(14,3) NOT NULL,
 unit_cost DECIMAL(14,2) NOT NULL,
 status ENUM('RESERVED','ISSUED','RETURNED','CANCELLED') NOT NULL DEFAULT 'RESERVED',
 created_by BIGINT UNSIGNED NULL,
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 KEY idx_cmms_work_order_parts_task (task_id,status),
 KEY idx_cmms_work_order_parts_part (part_id),
 CONSTRAINT fk_cmms_work_order_parts_task FOREIGN KEY (task_id) REFERENCES maintenance_tasks(id) ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT fk_cmms_work_order_parts_part FOREIGN KEY (part_id) REFERENCES warehouse_parts(id) ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT fk_cmms_work_order_parts_user FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS cmms_breakdown_reports (
 id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
 machine_id INT UNSIGNED NOT NULL,
 task_id BIGINT UNSIGNED NULL,
 reported_at DATETIME NOT NULL,
 severity ENUM('LOW','MEDIUM','HIGH','CRITICAL') NOT NULL DEFAULT 'MEDIUM',
 symptom VARCHAR(500) NOT NULL,
 root_cause TEXT NULL,
 corrective_action TEXT NULL,
 outcome VARCHAR(1000) NULL,
 downtime_minutes INT UNSIGNED NULL,
 reported_by BIGINT UNSIGNED NULL,
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 KEY idx_cmms_breakdown_machine_date (machine_id,reported_at),
 KEY idx_cmms_breakdown_task (task_id),
 CONSTRAINT fk_cmms_breakdown_machine FOREIGN KEY (machine_id) REFERENCES machines(id) ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT fk_cmms_breakdown_task FOREIGN KEY (task_id) REFERENCES maintenance_tasks(id) ON DELETE SET NULL ON UPDATE CASCADE,
 CONSTRAINT fk_cmms_breakdown_user FOREIGN KEY (reported_by) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS cmms_maintenance_manual_links (
 id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
 machine_id INT UNSIGNED NOT NULL,
 title VARCHAR(200) NOT NULL,
 document_url VARCHAR(1000) NOT NULL,
 document_type ENUM('MANUAL','PROCEDURE','DRAWING','OTHER') NOT NULL DEFAULT 'MANUAL',
 revision VARCHAR(80) NULL,
 active TINYINT(1) NOT NULL DEFAULT 1,
 created_by BIGINT UNSIGNED NULL,
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 KEY idx_cmms_manual_machine (machine_id,active),
 CONSTRAINT fk_cmms_manual_link_machine FOREIGN KEY (machine_id) REFERENCES machines(id) ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT fk_cmms_manual_link_user FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
