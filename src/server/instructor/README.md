# Instructor service boundary - Darryl

Implement assignment/rubric authoring, assessment requests, annotation validation, and assessment review/release here. Frontend screens belong under src/web/instructor/. Keep HTTP transport thin and put domain rules in testable services. Use the shared contracts and versioned database schema; do not create a separate user/course/submission store.

No feature endpoint exists yet. Every endpoint must use the agreed authentication and course/object authorization before reading data or invoking AI. Coordinate identity, AI gateway and schema changes with Keith.
