# Student service boundary - Keith

Implement draft saving, submission, released feedback views, and progress requests here. Frontend screens belong under src/web/student/. Preserve immutable submitted source and reject stale draft writes. Use shared contracts and the common database; do not create duplicate assignments, users, or assessment tables.

No feature endpoint exists yet. Add authentication and course/object checks before exposing data. Never return unreleased assessment drafts or private reference solutions to students.
