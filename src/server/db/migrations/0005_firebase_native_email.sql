-- Old generated-code proofs cannot be interpreted as native delivery tickets.
-- Preserve accounts, sessions, invitation tokens and audit history.
UPDATE auth_actions SET consumed_at=created_at WHERE consumed_at IS NULL;
