-- Phase 4 hidden failure findings. Additive and repeat-safe.
-- One row per machine/category/key fingerprint. workflow status is preserved
-- by the runner so acknowledged or resolved findings are not reopened by old
-- evidence. Evidence stores source record ids for traceability.

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
