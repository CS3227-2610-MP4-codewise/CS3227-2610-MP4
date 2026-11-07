# Local course provisioning

Apply local migrations using `npm run db:local`. First create and sign in to the local account using the existing authentication setup. Use `npm run auth:local -- accounts` to identify its exact account ID, issuer, and provider subject. Only use accounts you control and verify the identifiers independently.

Explicitly grant the instructor membership with:

```powershell
npm run course:local -- grant-instructor course-demo "Demo course" ACCOUNT_ID ISSUER SUBJECT
```

The operator creates the course if absent and grants this account an instructor membership; it does not use account-admin status. Check `affected_rows`. To revoke, use the same arguments with `revoke-instructor`. Existing course names are never overwritten. The helper is fixed to the local development D1 database and cannot target staging or production. No real learners or passwords should be used in synthetic local fixtures.
