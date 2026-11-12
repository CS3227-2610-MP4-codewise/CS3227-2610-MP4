# Darryl prompt experiment - pull recovery

Owner: Darryl. Scope: unblock local main update. No product requirements or deployment.

## Prompt PULL-01 - 2026-11-12 (time unavailable)

**Prompt (redacted):** Clear or reconcile the files blocking the local pull.

### Agents spawned

- New: none; no delegation requested. Reused: none. Main: /root; model unavailable.

### Token count

| Agent | Input | Cached input | Output | Total | Source record | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Main | unavailable | unavailable | unavailable | unavailable | unavailable | provisional; recorder EPERM |
| Children | none | none | none | none | observed | none |

Total/group unavailable; reconcile at a later accessible checkpoint. No controlled comparison.

### Experiment outcome

- Backed up and SHA-256 verified 50 conflicting local files to C:/Users/darry/AppData/Local/Temp/codewise-pull-recovery-20261112, including prior prompt entries and unique log additions. Restored 29 tracked paths to local HEAD and removed 21 untracked paths already present in remote main. Preserved nested worktrees and unrelated untracked evidence. Manifest identifies exact original paths and revisions.
- `git status` shows no tracked modifications. `git pull --ff-only` attempted but `.git/FETCH_HEAD` is read-only to this agent; user must run it in their own terminal. No product tests or deployment. Previous pull-log history remains in the recovery copy and the separately pushed logs branch; reconcile after pulling.

## Prompt PULL-02 - 2026-11-12 (time unavailable)

**Prompt (redacted):** Determine which files preserved during pull recovery belong in Git, push needed records and clear redundant copies.

### Agents spawned

- New: none; no delegation requested. Reused: none. Main: /root; model unavailable.

### Token count

| Agent | Input | Cached input | Output | Total | Source record | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Main | unavailable | unavailable | unavailable | unavailable | unavailable | provisional; recorder EPERM |
| Children | none | none | none | none | observed | none |

Total and group unavailable; reconcile later when permitted. No controlled comparison.

### Experiment outcome

- Compared all 50 recovery files with origin/main 8db7795. Product code and ordinary evidence match the remote. Earlier log publication introduced character encoding damage, and the recovery copy of log 22 contains the latest RSAI-10 prompt not yet on main. Shared contract and handoff differences are stale local copies or encoding, not new product changes.
- Repairing/publishing the affected redacted prompt records and this recovery record on a separate branch; no product edits, deployment or live provider calls. The checkout has no tracked modifications, preserving nested worktrees and unrelated module-wrapup prototypes.
