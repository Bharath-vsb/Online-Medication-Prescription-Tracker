-- =====================================================
-- MIGRATION: 001_create_ai_chat_history
-- Creates the ai_chat_history table for persisting
-- AI Agent conversation turns per user session.
--
-- Safe to run multiple times: uses CREATE TABLE IF NOT EXISTS
-- =====================================================

CREATE TABLE IF NOT EXISTS ai_chat_history (
  id          INT           PRIMARY KEY AUTO_INCREMENT,
  user_id     INT           NOT NULL,
  session_id  VARCHAR(100)  NOT NULL,
  role        ENUM('user', 'model') NOT NULL,
  message     TEXT          NOT NULL,
  tool_used   VARCHAR(100)  DEFAULT NULL,
  created_at  TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_session (user_id, session_id),
  INDEX idx_created_at  (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
