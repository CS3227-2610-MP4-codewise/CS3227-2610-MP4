-- Private AI gateway records: no prompt, source code, key, or provider response in audit counters.
CREATE TABLE ai_gateway_requests (
 id TEXT PRIMARY KEY,
 actor_id TEXT NOT NULL,
 course_id TEXT NOT NULL,
 action TEXT NOT NULL CHECK(action IN ('assessment-draft','progress-explanation')),
 idempotency_key TEXT NOT NULL,
 fingerprint TEXT NOT NULL,
 evidence_key TEXT NOT NULL,
 input_json TEXT NOT NULL,
 deadline_at INTEGER NOT NULL,
 created_at INTEGER NOT NULL,
 status TEXT NOT NULL CHECK(status IN ('pending','running','succeeded','failed','expired')),
 result_json TEXT,
 cache_until INTEGER,
 error_code TEXT,
 retry_after_seconds INTEGER CHECK(retry_after_seconds IS NULL OR retry_after_seconds>=0),
 UNIQUE(actor_id,course_id,action,idempotency_key)
);
-- statement
CREATE TABLE ai_gateway_attempts (
 lease_id TEXT PRIMARY KEY,
 request_id TEXT NOT NULL REFERENCES ai_gateway_requests(id),
 actor_id TEXT NOT NULL,
 provider_scope TEXT NOT NULL,
 created_at INTEGER NOT NULL,
 lease_until INTEGER NOT NULL,
 reserved_tokens INTEGER NOT NULL CHECK(reserved_tokens>0),
 state TEXT NOT NULL CHECK(state IN ('inflight','settled','uncertain')),
 settlement_marker TEXT,
 used_tokens INTEGER CHECK(used_tokens IS NULL OR used_tokens>=0),
 CHECK(lease_until>created_at)
);
-- statement
CREATE INDEX ai_gateway_attempt_provider ON ai_gateway_attempts(provider_scope,created_at);
-- statement
CREATE INDEX ai_gateway_attempt_actor ON ai_gateway_attempts(actor_id,created_at);
-- statement
CREATE TABLE ai_gateway_quota_policy (
 provider_scope TEXT PRIMARY KEY CHECK(provider_scope='soclaas-shared'),
 window_ms INTEGER NOT NULL CHECK(window_ms>0),
 user_request_limit INTEGER NOT NULL CHECK(user_request_limit>0),
 provider_request_limit INTEGER NOT NULL CHECK(provider_request_limit>0),
 user_token_limit INTEGER NOT NULL CHECK(user_token_limit>0),
 provider_token_limit INTEGER NOT NULL CHECK(provider_token_limit>0),
 concurrency_limit INTEGER NOT NULL CHECK(concurrency_limit>0)
);
