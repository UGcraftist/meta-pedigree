# DR-0001: Screens specified in ux.md until a Figma file exists

Date: 2026-11-14
Status: accepted
Category: design process
Reversibility: easy
Superseded by: —
Reviews: product owner

## Context
The `requirements` skill's gate expects the Must screens designed in Figma with all states and
marked `ready`, and stage 3 to read `ready` frames. There is no Figma connection (MCP or API) in
this environment and no Figma project exists yet. Blocking engineering on a tool the team does not
have would stall the whole workflow.

## Decision
Screen design lives in `docs/design/ux.md` as text wireframes, a screen index, per-screen state
lists and the accessibility rules. A screen is marked `ready` when the product owner approves its
wireframe and its states; the index plus the Mermaid flows are the handoff to stage 3. Images are
never pasted into docs.

## Options considered
- **Block stage 3 until Figma exists** — rejected: stalls every stage on tooling nobody has.
- **Skip screen design, code directly** — rejected: the three views are the product; without agreed
  layouts the architecture would be guessed.
- **Text wireframes in ux.md (chosen)** — cheap, reviewable in a diff, enough for stage 3.

## Consequences
- Stage 2 can pass with wireframes `in review`; owner approval flips them to `ready`.
- The gate checklist item "Figma frames ready" is read as "wireframes ready (DR-0001)".
- When a Figma file appears, rebuild frames from `ux.md` and supersede this record; no code
  rework is implied, because the wireframes already fix zones, states and IDs.
- Risk: visual fidelity is decided later, in code; D1 tokens (`ux.md`) are the guardrail.
