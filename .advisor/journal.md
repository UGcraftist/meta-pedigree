
---

## Round 3 (2026-11-19)

**Verdict: REQUEST CHANGES**

Findings: 1 fixed, 4 partially fixed, 2 not fixed.
- P1 (high): rollback/TH-02 test vacuous — assertion ran before a source was inserted; fixed payload.
- P2 (medium): unbounded `sources?select=id,url` — capped at 1000; fixed via count=exact.
- P3 (medium): `.advisor/*` in PR diff; fixed by reverting f774b30 edits on branch.
- P4 (low): object_kinds rule undocumented; fixed (prose + api.md line).
- P5 (low): probes still assert HTTP 400 on rollback/dangling; fixed (assert SQLSTATE).
- P6 (low): normalize_url missing definer; fixed (immutable, pinned search_path, revoked).
- P7 (low): sources store raw URL; fixed (normalize before insert + probe assert).

Key recommendation applied: assert `res.json.code` (SQLSTATE) instead of HTTP status; keep 403||42501 only where no body.

## Round 4 (2026-11-19)

**Verdict: APPROVE** (after 0f5595b + N-1/backfill). All findings fixed; N-1 doc comment and legacy-seed-URL backfill applied before merge.

## Merge (2026-11-19)

PR #5 merged by the person (`33a5ec9`). `0006_write_rpc` pasted; `make views-probe` and `make write-probe` green against the cloud dev project (editor/readonly accounts + `.env`).
