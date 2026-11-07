# Remote owner bootstrap — 2026-11-07

Darryl explicitly authorized owner bootstrap in staging and production. AUTH-01–03, SHA-12, CON-03/07. No application files, course permissions or student features changed. Credentials and session/CSRF tokens are excluded.

Both environments run reviewed main revision 79495387ec766c2d9c41b43ee87e9505e7d8bf85. GitHub Actions run [42277877576](https://github.com/CS3227-2610-MP4-codewise/CS3227-2610-MP4/actions/runs/42277877576) completed CI checks, secret scan, staging deployment and production release successfully. Production initially ran older281cc1392b722e873bc58fd806913c5f2121eeec without authentication endpoints. Darryl approved the production environment gate himself; the existing workflow applied migrations and deployed the tested revision. No ad hoc production migration or code publication.

Configured the two explicit temporary owner-bootstrap runtime secrets per environment, then used normal preauth-cookie/CSRF/origin-protected login. Production authentication initially returned configured:false despite all required secret names being present. Setting AUTH_ORIGIN to its exact HTTPS origin enabled bootstrap. Existing Firebase/Gmail credential settings were preserved.

| Check | Staging | Production |
| --- | --- | --- |
| Health/database | 200 / ok | 200 / ok |
| Authentication bootstrap | configured true | configured true |
| Initial owner login | 200 | 200 |
| Current session | 200 / administrator true | 200 / administrator true |
| Workspace | 200 / unavailable | 200 / unavailable |
| Verification logout | 200 | 200 |
| Login after removing both bootstrap secrets | 200 | 200 |
| Session after removal | 200 / administrator true | 200 / administrator true |
| Final verification logout | 200 | 200 |

Both temporary bootstrap secrets were removed after completion in each environment. Persistent app-owner mappings remain in each authoritative D1 store, using the shared provider identity. Local database rows were not copied. Verification sessions logged out; no email sent.

Account administration grants no course membership or instructor permissions. Keith course/destination producer remains absent, so invitations and protected course workspaces remain unavailable. Actual Gmail delivery, normal student setup/recovery, full UI/manual acceptance, Keith boundary review and hosted resource measurements remain pending. This evidence verifies remote owner login only.
