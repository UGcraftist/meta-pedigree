# Advisor protocol

You are the executor. A Claude Code advisor (tool `subagent_claude_code`) reviews your decisions on demand. It has no memory and cannot see your conversation; each call is a fresh run in this project folder. These files are what you share:

| File | Written by | Holds |
|---|---|---|
| `.advisor/context.md` | you only | "Now" (the decision up for review) and a one-line journal of steps |
| `.advisor/log.md` | the advisor only | its advice and the mistake records used to improve the workflow skills |

## When to call
Before you act on:
- an option choice or a decision record;
- a stage plan, a task breakdown or a task's implementation plan;
- a bug-fix approach;
- any deviation from a skill, requirement or decision record;
- asking a person to approve a stage gate.

Not for mechanical steps (running tests, formatting, routine commits).

## 1. Update the shared context
Create `.advisor/context.md` from this template if it does not exist. Before each call, rewrite "Now".

```markdown
# Shared context
## Now  (rewrite this section each time; keep it under 30 lines)
- Stage and skill step: <...>
- Current task and goal: <...>
- Decision or plan up for review: <in full: what you intend to do>
- Options considered and why this one: <...>
- Evidence: <file paths, FR/NFR, DR ids>
- Open questions: <...>
## Journal  (append one line per step, newest last; never edit old lines)
- <date> stage <n> <step>: <what you did or decided> → advisor: <verdict or "not asked">
```

## 2. Call the advisor
Call `subagent_claude_code` with exactly this text:

```
You are the advisor for this project. Read .advisor/context.md (the "Now" section and the last 20
journal lines), .advisor/log.md, AGENTS.md, docs/STATE.md, and the skill named in "Now" under
.claude/skills/. Review the decision or plan in "Now" against the skill, requirements and decision
records. Also scan the journal: any decision-type step marked "not asked" is a skipped review; log it
as a mistake with Cause: agent error. Do not edit any file except .advisor/log.md.
Reply: 1) Verdict: agree | change | block, with reasons. 2) Corrections as concrete steps.
3) Cause of any mistake: agent error (the skill was clear) or skill gap (unclear, missing or wrong;
give file:line).
Then append to .advisor/log.md:
## <date> · stage <n> · <step>
- Decision: <one line>
- Verdict: agree | change | block
- Mistake: none | <what went wrong>
- Cause: none | agent error | skill gap (<file:line>)
- Skill fix suggested: none | <wording change>
If you cannot write the file, end your reply with this entry under "LOG ENTRY".
```

## 3. Act on the reply
- Add the verdict to the journal line.
- **agree:** go ahead.
- **change:** apply the corrections. If you disagree, do not override it: tell the user both views and wait.
- **block:** stop and ask the user.
- If the reply ends with "LOG ENTRY", append that entry to `.advisor/log.md` word for word.
- Never edit `.advisor/log.md` otherwise.
