# Persistent owner bootstrap — verification,2026-11-07

Darryl/SH-AUTH; codex/shared-authentication based on b169c11b02959ca60191aef1e8dced29941c4968. AUTH-01–03 SHA-01–12 CON-03/07 UI-01/02/07/08 warm-workbook-v1. Current source uncommitted; prior UI/mail work preserved. User explicitly requested an invented NUS-format operator alias; no actual password/secret is in this evidence.

## Implemented scope

Optional BOOTSTRAP_OWNER_EMAIL/PASSWORD through normal guarded login. One persistent singleton/lease/completion, existing identity/session/admission store and auth_administrators grant; no new public setup route/default credentials/course tables. Owner is not email-verified. Immutable issuer/UID/email/passwordAt/validSince pins govern everyowner login/session, including provider emailVerified=true after external reset. Changed/deleted/revoked/disabled identities cannot rebootstrap. Operator secrets removable after completion. Global8–64 policy aligned. UI says Account admin, no fabricated course workspace.

## Independent review

Reused read-only /root/auth_review for design/source/focused runtime review. Design found a real takeover risk: provider external reset for fakealias could bypass app-only recovery denial. Repaired with immutable credential pins regardless current verified state; reviewer confirmed no remaining sourceblocker in reviewed delta. Reviewed no-overwrite/reservation/lease/completion grant/disabled/adminrevocation/absentKeith. Actual local runtime then exposed two prior Firebase client bugs missed by Node-only tests: unsupported redirect:error and global-fetch receiver binding. Fixed bound defaultfetch, manualredirect and3xxreject before parse. Focused reviewer confirmed no redirect credentialforwarding blocker. Reviewer inspected only, main ran checks. No Keith human review claimed.

## Executed checks

- npm run check:6 strict OpenSpec changes, types/lint,190Vitest/12files,4Node deployment checks and Vite build passed. JS242.96kB/gzip76.26/CSS10.49kB/gzip2.73 at that run. Final UI label rebuild242.97kB/gzip76.26 passed. Final focused managed-auth27/27 passed after adding exact ownercreate payload assertion.
- Owner suite initially6/9: three fixturefailures from rateclock/prematuredispose, repaired.9/9 passed; added explicitexpiredlease/retry boundary and final10/10 passed. Tests cover no-writebadproof/origin/browserflag, singletonrestart/noenv, noKeithbypass, pinimmutable/externalverifiedreset, localdisabled/adminrevoked, concurrentfirstlogin/interruptedprovider/collision, ordinaryunverifieddenial and8/64Unicodeboundaries.
- Native Miniflare regression uses syntheticRSA and mockedoutboundservice with DEFAULT Workerfetch: OAuth+lookup works;3xxstops without follow. Standalone native regression1/1 passed; included in full190. No real credentials in tests.
- Worker dryrun73.06KiB/gzip18.03 passed; no publish.

## Actual local provisioning and UI

Local .dev.vars initially lacked populatedvalues; user saved the samefile, presence-only recheck found allFirebase/Gmail fields. Added only localorigin and temporarybootstrap fields. Applied pendingmigrations0002–0006 toLOCAL development D1 only, noreset/drop or remoteSQL. Initial normalWorkerbootstrap503 created onlypendingreservation. Readonly Node/providerlookup and nativeWorker diagnostic isolated runtime incompatibilities. Node admincreate confirmed requested reservedFirebase testidentity with emailVerified:false (shared configuredFirebase project); then corrected normallocalWorkerbootstrap completed D1 owner.

Real local POSTlogin200, GETsession200 administrator:true, workspace unavailable. Verification sessions explicitlyloggedout. TemporaryBOOTSTRAP fields removed while preservingproviderkeys; subsequentlogin/session200 again. Browser signedin/reloaded /workspace after removal, displayed Account admin and course-unavailable state; local-owner.jpg. Browsertableftopen forDarryl. This is real localFirebase-backed ownerlogin, not justsyntheticpreview. No email sent. Staging/production D1/owneradmission/deployment notperformed; sharedFirebase testidentitycreation is actual and notclaimed as a productionappowner. Known testpassword is notshipped/defaulted or storedinD1/source.

## Pending acceptance/limitations

Keith course/object/destinationproducer and real instructorpermissions remain absent, so studentinvites/courseworkspace returnunavailable evenforowner. No rawrolebrowseroverride. Real Gmailauth/NUSinbox/normalstudentsetup/recovery/oldpasswordcookie flows, hostedFreeCPU/recoverybackgroundlifetime, completeUIresponsive/theme/keyboard/nativezoom matrix, Keith revised-boundaryreview and approvedstaging/production release remainpending. The fakealias is not amailbox; appownerrecoverydoesnotsend, and an externalprovidercredentialchange blocksowner until trustedoperatorrecovery (no automatic recoverytoolimplemented).

## Manual checklist

- Confirm local /sign-in accepts chosenoperatorcredentials, shows Account admin, survivesreload and keeps no fabricatedcourseaccess. Alreadybrowserchecked bymain; Darryl acceptancepending.
- InspectSETUP.md; deploy reviewedcode/migrations viaexistingpipeline, set explicit bootstrapsecrets for desiredremoteenvironment, firstsignin, thenremovebootstrapsecrets ifdesired. Nevercopylocal/syntheticrows orassume productionsetupcomplete.
- SupplyKeith reviewedcourse/destinationports and actualinstructorassignment beforerealstudentinvites; check foreign/revokeddenials. Verifyconsented NUSmail onlocalrealWorker orstaging;5176syntheticmaildoesnotcount.

Final secret scan initially flagged the runtime-generated PEM fixture construction, not a real secret. Refactored only the synthetic envelope label (no allowlist), reran native Worker test1/1 successfully, and final source-export scan passed. Ignored credentials and Git history excluded.

## Commit checkpoint — 2026-11-07

Current source is committed at 9b3d007e3f3d796b60b5e101f2758d3c443165d7; the source manifest now hashes Git blob bytes at that exact revision, superseding its earlier working-tree snapshot. Final full npm run check passed: six strict OpenSpec changes, types/lint, 191 Vitest tests/12 files, four Node deployment tests, and Vite build (JS242.97kB/gzip76.26, CSS10.49kB/gzip2.73). The first restricted check could not start esbuild because of local directory access; the rerun with required access passed. Source-export Gitleaks8.24.2 scanned approximately1.52MB with no leaks, excluding ignored files and Git history. No deployment or new manual/Keith acceptance is implied.
