-- Phase 2 security hardening. Additive and repeat-safe.
-- revoked_sessions supports server-side logout of an individual JWT (jti).
-- users.token_version (Phase 1) invalidates every session for an account.

CREATE TABLE IF NOT EXISTS revoked_sessions (
  jti CHAR(36) NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  expires_at DATETIME NOT NULL,
  revoked_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reason VARCHAR(40) NOT NULL DEFAULT 'logout',
  PRIMARY KEY (jti),
  KEY idx_revoked_sessions_user (user_id, expires_at),
  KEY idx_revoked_sessions_expiry (expires_at),
  CONSTRAINT fk_revoked_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
