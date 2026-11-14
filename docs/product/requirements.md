# Requirements: Meta Pedigree

> Engineering translation of the agreed stories in [stories.md](stories.md) (stage-1 gate,
> approved 2026-11-14 by UGcraftist). Test set: US/EU embodied-AI companies (≤100 orgs);
> production target: political parties — so the model reserves party-domain slots now (FR-011),
> even though they stay empty in the test set.

## Functional requirements

| ID | Requirement (The system shall…) | From story | Priority | Acceptance test |
|---|---|---|---|---|
| FR-001 | attach to every fact a source (name, locator, data-as-of date), and label facts without a source "无来源" rather than leaving them blank | US-001 | Must | pick a relation; its detail shows source + locator + as-of, or the explicit "无来源" label |
| FR-002 | produce a copyable citation naming author/source/locator for any fact | US-001 | Must | copy citation of a role; pastes as one line with locator |
| FR-003 | store and render time precision as year / month / day / range / unknown, never silently upcasting to day | US-002 | Must | year-only record renders as a band, not a point; precision tag visible |
| FR-004 | keep conflicting values side by side with one source each, and never silently merge them | US-002 | Must | two sources with different years both listed next to the fact |
| FR-005 | count missing values separately in filters and exports (missing ≠ zero, ≠ "no") | US-002 | Must | export reports "missing: N" distinct from 0 |
| FR-006 | let the curator create and edit organizations, persons, roles, relations, events and sources, rejecting dangling references and naming the offender | US-003 | Must | save a relation to a non-existent org → rejected with the bad id named |
| FR-007 | record who / when / what for every save, and show it on the object | US-003 | Must | edit a relation; object history lists editor, time, old→new |
| FR-008 | reflect curator edits after a page refresh, with no rebuild or redeploy | US-003 | Must | add org + relation; refresh → both visible in correct time position |
| FR-009 | treat relation types and attribute definitions as data in a registry, so a new type renders generically without code changes | US-024 | Must | add a new type (e.g. `electoral_alliance`) via registry; it renders and filters without a deploy |
| FR-010 | export and import the registry as a versioned vocabulary, and ingest the enterprise sample and a party sample with the same schema | US-024 | Must | load enterprise dataset, then party dataset; both validate and render; no migration |
| FR-011 | carry reserved, nullable, typed party-domain fields: faction, alliance, election contest (office, result, vote share), ideology position on named axes, legal status (active/banned/dissolved/merged), membership type and count, cross-party role — empty for enterprise data and never breaking a view | US-024 | Must | party fixture fills these fields; enterprise fixture leaves them null; tree/timeline/network render both |
| FR-012 | focus an organization and highlight its lineage chain (ancestors, successors, branches) while dimming the rest | US-004 | Must | click an org → its chain highlighted, others at low opacity |
| FR-013 | store merge / split / rename / succession-control / alliance as distinct relation types with distinct visual encoding, and allow untyped "related" as a fallback | US-005 | Must | each of the five renders differently; legend names them; fallback still renders |
| FR-014 | treat same-name organizations as separate identities until a curator decides, offering candidates as suggestions rather than auto-merging | US-006 | Must | two same-name orgs stay separate; merge requires a decision record with source |
| FR-015 | carry percentage and effective dates on control relations and render the control chain | US-007 | Should | 51 % control of A over B shows the chain and the number |
| FR-016 | place 2–3 selected organizations or regions side by side on one shared time axis | US-008 | Should | select three orgs → aligned bands on one axis |
| FR-017 | show a person's roles across organizations over time, with start/end and precision | US-009 | Must | person page lists roles in time order with gaps visible |
| FR-018 | list who held roles in organization O during period P | US-010 | Should | set O + period → member list for that slice |
| FR-019 | derive "current position" from the latest role plus its as-of date, and flag positions stale for more than a year | US-011 | Should | person last seen in 2019 → labelled "last confirmed 2019" |
| FR-020 | keep same-name persons as separate identities and offer evidence-backed merge suggestions | US-012 | Should | two persons same name → suggestions shown, no auto-merge |
| FR-021 | focus any object with highlighting and dimming, and restore the previous view on exit | US-013 | Must | focus → dim; Esc → previous view state restored |
| FR-022 | compare 2–3 objects on an aligned time axis and summarize the differences | US-014 | Should | compare two parties → align + diff list |
| FR-023 | filter by time range, org type, geography, relation type, confidence and source, combinable, and persist the filter in the URL | US-015 | Must | combine two filters; reload page → same filtered view |
| FR-024 | search organizations and persons by name and alias, and jump to focus without losing context | US-016 | Must | search an alias → result → focus, back navigation intact |
| FR-025 | render the same dataset as pedigree tree, timeline and relation network, and preserve focus, filter and selection when switching | US-017 | Must | switch view → same objects focused; filters intact |
| FR-026 | stay interactive at the R1 scale (NFR-013) while panning and zooming, without recomputing the full layout on every frame | US-018 | Must | load 100-org set; pan/zoom ≥30 fps; no layout freeze |
| FR-027 | produce a read-only share link that captures the current view state | US-019 | Should | copy link, open in a private window → same view |
| FR-028 | export the current view as PNG/SVG with a source appendix, and export the underlying subset as CSV/JSON | US-020 | Should | export PNG contains attribution list; CSV round-trips |
| FR-029 | publish a curated snapshot to a public URL with site name, data edition, attribution and licence | US-021 | Won't (R1) · R2 | public URL serves frozen edition; edition id visible |
| FR-030 | enforce visibility per object and per field (public / limited) on the server, never leaking limited fields into public output | US-022 | Won't (R1) · R2 | request a limited field as anonymous → 403; public page omits it |
| FR-031 | support draft → review → publish, with editor and reviewer roles, comments, rejection and version history | US-023 | Won't (R1) · R2 | editor submits, reviewer rejects with comment, resubmit passes |

## Non-functional requirements

| ID | Category | Requirement (with number) | Source | Priority |
|---|---|---|---|---|
| NFR-001 | Performance | initial dataset load ≤3 s and ≥30 fps pan/zoom at NFR-013 scale on a mid-range laptop | US-018; *assumption* | Must |
| NFR-002 | Performance | search returns in ≤300 ms p95 over ≤5,000 sources / ≤1,500 relations | US-016; *assumption* | Must |
| NFR-003 | Scale | R1 data: ≤100 orgs, ≤500 persons, ≤1,500 relations, ≤5,000 sources; schema and queries must hold 10× in R3 | Q1, US-018 | Must |
| NFR-004 | Scale | R1: 1 editor + 5 viewers concurrently; R2 public: 50 concurrent viewers, 99.5 % availability | *assumption* | Should |
| NFR-005 | Availability | R1: single machine, 99 % during working hours; daily backup, restore ≤1 h, RPO 24 h | *assumption* | Must |
| NFR-006 | Security | authentication for all writes; sessions expire after 12 h; audit log retained 1 year; no secret values in the repository | US-022, US-023 | Must |
| NFR-007 | Privacy | only published, public-figure information: no home addresses, private contacts or minors; deletion requests honoured ≤7 days | GDPR, *assumption* | Must |
| NFR-008 | Compliance | record the licence per source dataset; excerpt only (no bulk republication); attribution on every export and public page | US-020, US-021 | Must |
| NFR-009 | Accessibility | WCAG 2.1 AA for text and controls; every object has a table/text alternative; all actions keyboard reachable | *assumption* | Should |
| NFR-010 | Compatibility | latest two versions of Chrome, Edge, Firefox and Safari, desktop ≥1024 px; no native mobile app | stories "Not doing" | Must |
| NFR-011 | Operability | structured logs, health endpoint, one-command deploy, versioned schema migrations, configuration via environment | *assumption* | Must |
| NFR-012 | Cost | R1 infrastructure ≤ US$30/month; no per-seat commercial graph database licence | project owner budget | Must |
| NFR-013 | Data volume | R1 dataset targets: ≤100 orgs, ≤500 persons, ≤1,500 relations, ≤5,000 sources (revised after collection) | Q1 | Must |
| NFR-014 | Time correctness | every temporal value carries a precision tag and is stored as a half-open interval [start, end) so year-only values are unambiguous | US-002 | Must |
| NFR-015 | No requirement | offline use, native app, real-time multi-user editing — out of scope (stories "Not doing") | — | Won't |

## Data requirements

| Data | Source | Owner | Sensitivity | Retention |
|---|---|---|---|---|
| Organization (name, aliases, kind, geography, status, dates) | curator entry from public sources | P4 | private until published | all versions, soft delete + reason |
| Person (name, aliases, public bio) | curator entry | P4 | private until published | all versions, soft delete + reason |
| Role / position (person, org, title, interval, precision) | curator entry | P4 | private until published | all versions |
| Relation (type from registry, from, to, interval, percentage, ids) | curator entry | P4 | private until published | all versions |
| Event (e.g. founding, merger, election) | curator entry | P4 | private until published | all versions |
| Source (name, author, locator, date, licence, as-of) | curator entry | P4 | public | kept permanently |
| Fact / claim (field, value, source, precision, confidence) | curator entry | P4 | per visibility rule | kept permanently |
| No-source fact (fact with an empty source, allowed since 2026-11-14) | curator entry | P4 | private until published | kept, always flagged `无来源` |
| Vocabulary / registry (relation + attribute types, version) | P4 | P4 | public | versioned, never rewritten |
| **Party-domain reserved slots** (faction, alliance, election contest, ideology axes, legal status, membership, cross-party role) | party dataset only (Q9) | P4 | private until published | kept permanently; null for enterprise datasets |
| User (account, role, session) | system | project owner | restricted | account life + audit 1 year |
| Audit log (who, when, what, before/after) | system | project owner | restricted | 1 year |
| Public snapshot (frozen edition) | publish action | P4 | public | kept per edition |

Data owning rule: one dataset, one edition; every field value is a claim with a source; the registry is the only place types are defined.

## Scope

### In scope (R1)
- One curated dataset (US/EU embodied-AI companies, ≤100 orgs) with sources and precision.
- Three views (tree, timeline, network) from one dataset; focus, filter, search, compare.
- Curator entry with audit and referential integrity.
- Domain-neutral model with party slots reserved and empty.
- Read-only link sharing and image/data export.

### Out of scope
- Automatic crawling or LLM relation extraction (explicitly rejected in stories).
- Public publication, visibility model, review workflow (R2 — needs security review).
- Native mobile app, offline sync, real-time co-editing.
- General-purpose graph editor for arbitrary entity types.

## Constraints
- Team: 1–2 people part-time; no dedicated designer, no Figma seat confirmed.
- Web only, desktop first; single machine in R1; budget ≤ US$30/month.
- No commercial graph database; rendering library choice deferred to stage 3.
- Sources are copyrighted third-party material: citations and short excerpts only.
- Chinese-first UI copy; English data fields where the domain demands it.

## Assumptions and dependencies

| ID | Assumption / dependency | Risk if wrong | Owner |
|---|---|---|---|
| A-01 | The test set can be assembled from public sources within ~2 weeks of curation | R1 demo slips | P4 |
| A-02 | US/EU embodied-AI companies really share the five relation types (merge, split, rename, control, alliance) | A sixth type appears; FR-009 already absorbs it | P1 |
| A-03 | Party-domain field list (Q9) arrives before stage 3 freezes the schema | Reserved slots are guessed and need rework | project owner |
| A-04 | Single curator is enough for R1; public launch waits for R2 | Scope grows; R2 pulls ahead | project owner |
| A-05 | Mid-range laptop is the performance reference device | NFR-001 numbers guessed | project owner |
| A-06 | Figma or equivalent is unavailable; design stays text + Mermaid until stage 3 | Screens are reviewed late | project owner |
| A-07 | Team effort is unmeasured (part-time, 1–2 people) | "Must fits ~60 % effort" cannot be verified | project owner |

## Interfaces and ownership

| Boundary | Our side | Other side | Owner |
|---|---|---|---|
| Source documents (books, news, registries) | citation + short excerpt | publisher / archive | source keeps its licence; we keep the citation |
| Export files (PNG/SVG/CSV/JSON) | generation | analyst's report or paper | user |
| Public site (R2) | frozen edition + attribution | anonymous readers | P4 |
| Registry vocabulary | versioned export/import | future party dataset | P4 |

## Prioritization

Method: MoSCoW (default). Must = 20 FRs, all in R1; effort estimate is invalid until the plan (stage 4), so the "Must ≈60 %" check is deferred and flagged as A-07.

- **Must**: FR-001–014, FR-017, FR-021, FR-023–026 + NFR-001, 003, 005–008, 010–014.
- **Should**: FR-015, 016, 018–020, 022, 027, 028.
- **Could**: none added yet (candidates after the first dataset: alias management, saved searches).
- **Won't (R1)**: FR-029, 030, 031 (R2 with the security review), NFR-015.

### Release slices
- **R1 (MVP)**: private, single-curator analysis over the 100-org test set; three views, provenance, precision, party slots reserved.
- **R2**: public snapshot, visibility model, review workflow, party dataset pilot.
- **R3**: 10× scale, alias/saved-search features, performance hardening.

## Traceability

| Story | Requirements |
|---|---|
| US-001 | FR-001, FR-002 |
| US-002 | FR-003, FR-004, FR-005, NFR-014 |
| US-003 | FR-006, FR-007, FR-008 |
| US-004 | FR-012 |
| US-005 | FR-013 |
| US-006 | FR-014 |
| US-007 | FR-015 |
| US-008 | FR-016 |
| US-009 | FR-017 |
| US-010 | FR-018 |
| US-011 | FR-019 |
| US-012 | FR-020 |
| US-013 | FR-021 |
| US-014 | FR-022 |
| US-015 | FR-023 |
| US-016 | FR-024 |
| US-017 | FR-025 |
| US-018 | FR-026, NFR-001, NFR-003 |
| US-019 | FR-027 |
| US-020 | FR-028, NFR-008 |
| US-021 | FR-029 |
| US-022 | FR-030, NFR-006, NFR-007 |
| US-023 | FR-031, NFR-006 |
| US-024 | FR-009, FR-010, FR-011 |
