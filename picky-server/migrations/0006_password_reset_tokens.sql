-- Up Migration
-- Password reset links reuse the hashed, single-use email tokens that verification already uses.
ALTER TABLE email_tokens DROP CONSTRAINT email_tokens_purpose_check;
ALTER TABLE email_tokens
  ADD CONSTRAINT email_tokens_purpose_check CHECK (purpose IN ('verify_email', 'reset_password'));

-- Down Migration
DELETE FROM email_tokens WHERE purpose = 'reset_password';
ALTER TABLE email_tokens DROP CONSTRAINT email_tokens_purpose_check;
ALTER TABLE email_tokens
  ADD CONSTRAINT email_tokens_purpose_check CHECK (purpose IN ('verify_email'));
