# advisor log — written by Claude Code, read-only for the executor

<!-- append one block per advisor call; newest last -->
2026-11-15 22:55 probe — Claude Code direct write OK (Edit tool).

## 2026-11-15 · stage 5 · step 8 debt + T-007 plan
- Decision: one cumulative fresh-reviewer pass over T-004→T-006, keep branch review as the PR substitute, then T-007 write RPCs → Verdict: **change**
- Mistake: review scope named S-02/S-03 (S-03 = T-011, not built — review T-004/T-005/T-006 criteria, plan.md:54-62); `0003_write_rpc` collides with existing `0003_tree_direction`/`0004_tree_nodes_dedup` → use `0005_write_rpc` and fix api.md:45 + plan.md:24; `make write-probe` and `set search_path` exist only as prose intent (no Makefile target, no mention in security.md); plan.md:66 "只读用户写被拒" needs a second non-editor test user, anon alone does not cover it; merge_source URL normalization rule is undefined in api.md; the no-remote PR substitution is flagged only in STATE.md, never recorded as a CR in changes.md.
- Cause: agent error (plan.md:54-66 and implementation/SKILL.md:21,30 are clear) + skill gap: implementation/SKILL.md:32-37 assumes a remote and a PR to comment on, and offers no fallback when none exists → Skill fix suggested: add to step 8 "No remote: a fresh reviewer still reviews the branch diff against the task's acceptance criteria; store the notes in a `docs(review):` commit on the branch and record the missing-PR deviation as a change request."
