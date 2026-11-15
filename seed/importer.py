"""Seed bundle validation and import for Meta Pedigree.

A seed bundle is a directory of JSON files (any names, loaded in sorted order) whose
top-level keys are subsets of:

    relation_types, stance_axes, orgs, persons, facts, stances

Facts embed their sources inline:

    {"id": "...", "subject_kind": "org", "subject_id": "...",
     "predicate_code": "acquired", "status": "published",
     "sources": [{"kind": "article", "title": "...", "url": "https://..."}]}

Validation runs without a database (``--dry-run``) so it can gate seed data in CI;
a bundle that fails validation is never written. The importer is idempotent:
rows are upserted by id and re-running the same bundle is a no-op except the
audit_log row.

Usage:
    python -m seed.importer --data seed/data --dry-run
    DATABASE_URL=postgres://... python -m seed.importer --data seed/data
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import os
import sys
import uuid
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Iterable

KINDS = {"org", "person"}
ORG_KINDS = {"company", "lab", "program", "team", "government", "other"}
PRECISIONS = {"day", "month", "year", "unknown"}
QUALIFIERS = {"exact", "circa", "before", "after", "between", "unknown"}
FACT_STATUSES = {"draft", "in_review", "published", "disputed", "superseded"}
VISIBILITIES = {"public", "hidden"}
SOURCE_KINDS = {"article", "interview", "book", "filing", "dataset", "video", "other"}
BUNDLE_KEYS = {"relation_types", "stance_axes", "orgs", "persons", "facts", "stances"}


@dataclass
class Issue:
    severity: str  # "error" | "warning"
    where: str  # file or object path
    message: str

    def __str__(self) -> str:
        return f"{self.severity}: {self.where}: {self.message}"


@dataclass
class Bundle:
    relation_types: list[dict[str, Any]] = field(default_factory=list)
    stance_axes: list[dict[str, Any]] = field(default_factory=list)
    orgs: list[dict[str, Any]] = field(default_factory=list)
    persons: list[dict[str, Any]] = field(default_factory=list)
    facts: list[dict[str, Any]] = field(default_factory=list)
    stances: list[dict[str, Any]] = field(default_factory=list)


def load_bundle(path: Path) -> tuple[Bundle, list[Issue]]:
    """Load every ``*.json`` file in *path* into one bundle."""
    issues: list[Issue] = []
    bundle = Bundle()
    if not path.is_dir():
        return bundle, [Issue("error", str(path), "seed data directory does not exist")]

    for file in sorted(path.glob("*.json")):
        try:
            payload = json.loads(file.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as exc:
            issues.append(Issue("error", file.name, f"cannot read JSON: {exc}"))
            continue
        if not isinstance(payload, dict):
            issues.append(Issue("error", file.name, "top level must be an object"))
            continue
        unknown = set(payload) - BUNDLE_KEYS
        if unknown:
            issues.append(Issue("error", file.name, f"unknown top-level keys: {sorted(unknown)}"))
        for key in BUNDLE_KEYS & set(payload):
            rows = payload[key]
            if not isinstance(rows, list):
                issues.append(Issue("error", f"{file.name}:{key}", "must be a list"))
                continue
            for index, row in enumerate(rows):
                if not isinstance(row, dict):
                    issues.append(Issue("error", f"{file.name}:{key}[{index}]", "must be an object"))
                    continue
                row.setdefault("_where", f"{file.name}:{key}[{index}]")
                getattr(bundle, key).append(row)
    return bundle, issues


def _is_uuid(value: Any) -> bool:
    try:
        uuid.UUID(str(value))
    except (ValueError, TypeError, AttributeError):
        return False
    return True


def _parse_date(value: Any, where: str, issues: list[Issue]) -> dt.date | None:
    if value is None:
        return None
    if not isinstance(value, str):
        issues.append(Issue("error", where, f"date must be a string, got {type(value).__name__}"))
        return None
    try:
        return dt.date.fromisoformat(value)
    except ValueError:
        issues.append(Issue("error", where, f"not an ISO date: {value!r}"))
        return None


def _check_temporal(row: dict[str, Any], prefix: str, issues: list[Issue]) -> None:
    """Enforce the precision/date pairing of NFR-014 and data-model.md.

    ``prefix`` is "" for facts/stances (start_*/end_*) and e.g. "founded_" for
    orgs/persons, whose date columns are named <verb>_date / <verb>_precision and
    which carry no qualifier.
    """
    where = row["_where"]
    for bound in ("start", "end"):
        date_key = f"{prefix}{bound}_date"
        precision_key = f"{prefix}{bound}_precision"
        precision = row.get(precision_key, "unknown")
        if precision not in PRECISIONS:
            issues.append(Issue("error", where, f"{precision_key}={precision!r} not in {sorted(PRECISIONS)}"))
            continue
        parsed = _parse_date(row.get(date_key), f"{where}.{date_key}", issues)
        if precision == "unknown" and parsed is not None:
            issues.append(Issue("error", where, f"{date_key} set while {precision_key} is 'unknown'"))
        if precision != "unknown" and parsed is None:
            issues.append(Issue("error", where, f"{precision_key}={precision!r} requires {date_key}"))
        if parsed is None:
            continue
        if precision == "year" and (parsed.month, parsed.day) != (1, 1):
            issues.append(Issue("error", where, f"{date_key} must be Jan 1 for year precision"))
        if precision == "month" and parsed.day != 1:
            issues.append(Issue("error", where, f"{date_key} must be the first day for month precision"))

    if not prefix:
        qualifier = row.get("qualifier", "exact")
        if qualifier not in QUALIFIERS:
            issues.append(Issue("error", where, f"qualifier={qualifier!r} not in {sorted(QUALIFIERS)}"))
        if qualifier == "unknown" and (row.get("start_date") or row.get("end_date")):
            issues.append(Issue("error", where, "qualifier 'unknown' forbids start/end dates"))
        if qualifier == "between" and not (row.get("start_date") and row.get("end_date")):
            issues.append(Issue("error", where, "qualifier 'between' requires both start and end dates"))

    start = row.get(f"{prefix}start_date")
    end = row.get(f"{prefix}end_date")
    if start and end and start >= end:
        issues.append(Issue("error", where, f"start {start} is not before end {end} (half-open interval)"))


def validate(bundle: Bundle) -> list[Issue]:
    """Return every error and warning; an empty error list means the bundle is importable."""
    issues: list[Issue] = []

    relation_codes = {r.get("code") for r in bundle.relation_types}
    axis_codes = {a.get("code"): a for a in bundle.stance_axes}
    org_ids = {o.get("id") for o in bundle.orgs}
    person_ids = {p.get("id") for p in bundle.persons}
    fact_ids = {f.get("id") for f in bundle.facts}

    seen: set[tuple[str, str]] = set()
    for key in BUNDLE_KEYS:
        for row in getattr(bundle, key):
            where = row.get("_where", key)
            row_id = row.get("id") or row.get("code")
            ident = str(row_id)
            if not ident or ident == "None":
                issues.append(Issue("error", where, "missing id/code"))
                continue
            if (key, ident) in seen:
                issues.append(Issue("error", where, f"duplicate id {ident}"))
            seen.add((key, ident))
            if key not in {"relation_types", "stance_axes"} and not _is_uuid(row_id):
                issues.append(Issue("error", where, f"id {ident!r} is not a UUID"))

    for rt in bundle.relation_types:
        code = rt.get("code", rt.get("_where"))
        if not code:
            issues.append(Issue("error", rt["_where"], "missing code"))
        if not rt.get("label_zh") or not rt.get("label_en"):
            issues.append(Issue("error", rt["_where"], f"{code}: label_zh and label_en are required"))
        if rt.get("subject_kinds") and not set(rt["subject_kinds"]) <= KINDS:
            issues.append(Issue("error", rt["_where"], f"{code}: subject_kinds must be in {sorted(KINDS)}"))
        if rt.get("object_kinds") and not set(rt["object_kinds"]) <= KINDS:
            issues.append(Issue("error", rt["_where"], f"{code}: object_kinds must be in {sorted(KINDS)}"))

    for ax in bundle.stance_axes:
        code = ax.get("code")
        lo, hi = ax.get("scale_min"), ax.get("scale_max")
        if lo is None or hi is None or lo >= hi:
            issues.append(Issue("error", ax["_where"], f"{code}: scale_min must be below scale_max"))

    for org in bundle.orgs:
        where = org["_where"]
        if not str(org.get("name", "")).strip():
            issues.append(Issue("error", where, f"{org.get('id')}: name is required"))
        if org.get("kind", "company") not in ORG_KINDS:
            issues.append(Issue("error", where, f"{org.get('id')}: kind {org.get('kind')!r} not in {sorted(ORG_KINDS)}"))
        if org.get("visibility", "public") not in VISIBILITIES:
            issues.append(Issue("error", where, f"{org.get('id')}: visibility {org.get('visibility')!r} invalid"))
        # founded/dissolved use <name>_date + <name>_precision, not start/end
        _check_named_temporal(org, "founded", issues)
        _check_named_temporal(org, "dissolved", issues)

    for person in bundle.persons:
        _check_named_temporal(person, "birth", issues)
        _check_named_temporal(person, "death", issues)

    for fact in bundle.facts:
        where = fact["_where"]
        fid = fact.get("id")
        if fact.get("subject_kind") not in KINDS:
            issues.append(Issue("error", where, f"{fid}: subject_kind must be org|person"))
        elif str(fact.get("subject_id")) not in (org_ids | person_ids):
            issues.append(Issue("error", where, f"{fid}: dangling subject id {fact.get('subject_id')}"))
        predicate = fact.get("predicate_code")
        if predicate not in relation_codes:
            issues.append(Issue("error", where, f"{fid}: dangling predicate code {predicate!r}"))
        relation = next((r for r in bundle.relation_types if r.get("code") == predicate), None)
        if relation:
            if relation.get("subject_kinds") and fact.get("subject_kind") not in relation["subject_kinds"]:
                issues.append(Issue("error", where,
                    f"{fid}: predicate {predicate!r} does not accept subject_kind {fact.get('subject_kind')!r}"))
            if relation.get("object_kinds") and fact.get("object_kind") not in relation["object_kinds"]:
                issues.append(Issue("error", where,
                    f"{fid}: predicate {predicate!r} does not accept object_kind {fact.get('object_kind')!r}"))
        if fact.get("object_kind") is None and fact.get("object_id") is not None:
            issues.append(Issue("error", where, f"{fid}: object_id without object_kind"))
        if fact.get("object_kind") is not None:
            if fact["object_kind"] not in KINDS:
                issues.append(Issue("error", where, f"{fid}: object_kind must be org|person"))
            elif str(fact.get("object_id")) not in (org_ids | person_ids):
                issues.append(Issue("error", where, f"{fid}: dangling object id {fact.get('object_id')}"))
        if fact.get("status", "draft") not in FACT_STATUSES:
            issues.append(Issue("error", where, f"{fid}: status {fact.get('status')!r} invalid"))
        if fact.get("visibility", "public") not in VISIBILITIES:
            issues.append(Issue("error", where, f"{fid}: visibility {fact.get('visibility')!r} invalid"))
        if fact.get("certainty", "exact") not in QUALIFIERS:
            issues.append(Issue("error", where, f"{fid}: certainty {fact.get('certainty')!r} invalid"))
        if fact.get("revision_of"):
            if fact["revision_of"] == fid:
                issues.append(Issue("error", where, f"{fid}: cannot revise itself"))
            elif fact["revision_of"] not in fact_ids:
                issues.append(Issue("error", where, f"{fid}: dangling revision_of {fact['revision_of']}"))
        _check_temporal(fact, "", issues)
        sources = fact.get("sources", [])
        if not isinstance(sources, list):
            issues.append(Issue("error", where, f"{fid}: sources must be a list"))
            sources = []
        if fact.get("status") == "published" and not sources and not fact.get("no_source"):
            issues.append(Issue("error", where, f"{fid}: published fact needs a source or no_source=true"))
        for source in sources:
            url = source.get("url")
            if url is not None and not str(url).startswith(("http://", "https://")):
                issues.append(Issue("error", where, f"{fid}: source url must be http(s): {url!r}"))
            if not str(source.get("title", "")).strip():
                issues.append(Issue("error", where, f"{fid}: source title is required"))
            if source.get("kind", "article") not in SOURCE_KINDS:
                issues.append(Issue("error", where, f"{fid}: source kind {source.get('kind')!r} invalid"))

    for stance in bundle.stances:
        where = stance["_where"]
        sid = stance.get("id")
        if str(stance.get("party_org_id")) not in org_ids:
            issues.append(Issue("error", where, f"{sid}: dangling party_org_id {stance.get('party_org_id')}"))
        if stance.get("target_org_id") and str(stance["target_org_id"]) not in org_ids:
            issues.append(Issue("error", where, f"{sid}: dangling target_org_id {stance['target_org_id']}"))
        axis = axis_codes.get(stance.get("axis_code"))
        if axis is None:
            issues.append(Issue("error", where, f"{sid}: dangling axis_code {stance.get('axis_code')!r}"))
        else:
            value = stance.get("value")
            if not isinstance(value, (int, float)) or not (axis["scale_min"] <= value <= axis["scale_max"]):
                issues.append(Issue("error", where, f"{sid}: value {value!r} outside axis range "
                                                   f"[{axis['scale_min']}, {axis['scale_max']}]"))
        _check_temporal(stance, "", issues)

    return issues


def _check_named_temporal(row: dict[str, Any], name: str, issues: list[Issue]) -> None:
    """Validate a <name>_date / <name>_precision pair (no qualifier involved)."""
    precision = row.get(f"{name}_precision", "unknown")
    where = row["_where"]
    if precision not in PRECISIONS:
        issues.append(Issue("error", where, f"{name}_precision={precision!r} not in {sorted(PRECISIONS)}"))
        return
    parsed = _parse_date(row.get(f"{name}_date"), f"{where}.{name}_date", issues)
    if precision == "unknown" and parsed is not None:
        issues.append(Issue("error", where, f"{name}_date set while {name}_precision is 'unknown'"))
    if precision != "unknown" and parsed is None:
        issues.append(Issue("error", where, f"{name}_precision={precision!r} requires {name}_date"))
    if parsed is None:
        return
    if precision == "year" and (parsed.month, parsed.day) != (1, 1):
        issues.append(Issue("error", where, f"{name}_date must be Jan 1 for year precision"))
    if precision == "month" and parsed.day != 1:
        issues.append(Issue("error", where, f"{name}_date must be the first day for month precision"))


def errors(issues: Iterable[Issue]) -> list[Issue]:
    return [issue for issue in issues if issue.severity == "error"]


# ── Database import ──────────────────────────────────────────────────────────


SQL_UPSERT_RELATION_TYPE = """
insert into public.relation_types
  (code, label_zh, label_en, subject_kinds, object_kinds, implied_parent, attrs_schema, is_active)
values (%s, %s, %s, %s, %s, %s, %s::jsonb, %s)
on conflict (code) do update set
  label_zh = excluded.label_zh, label_en = excluded.label_en,
  subject_kinds = excluded.subject_kinds, object_kinds = excluded.object_kinds,
  implied_parent = excluded.implied_parent, attrs_schema = excluded.attrs_schema,
  is_active = excluded.is_active
"""

SQL_UPSERT_AXIS = """
insert into public.stance_axes (code, label_zh, label_en, scale_min, scale_max, anchors)
values (%s, %s, %s, %s, %s, %s::jsonb)
on conflict (code) do update set
  label_zh = excluded.label_zh, label_en = excluded.label_en,
  scale_min = excluded.scale_min, scale_max = excluded.scale_max, anchors = excluded.anchors
"""

SQL_UPSERT_ORG = """
insert into public.orgs
  (id, name, kind, country_code, founded_date, founded_precision,
   dissolved_date, dissolved_precision, visibility, notes)
values (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
on conflict (id) do update set
  name = excluded.name, kind = excluded.kind, country_code = excluded.country_code,
  founded_date = excluded.founded_date, founded_precision = excluded.founded_precision,
  dissolved_date = excluded.dissolved_date, dissolved_precision = excluded.dissolved_precision,
  visibility = excluded.visibility, notes = excluded.notes
"""

SQL_UPSERT_PERSON = """
insert into public.persons
  (id, name, aliases, country_code, birth_date, birth_precision,
   death_date, death_precision, visibility, notes)
values (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
on conflict (id) do update set
  name = excluded.name, aliases = excluded.aliases, country_code = excluded.country_code,
  birth_date = excluded.birth_date, birth_precision = excluded.birth_precision,
  death_date = excluded.death_date, death_precision = excluded.death_precision,
  visibility = excluded.visibility, notes = excluded.notes
"""

SQL_UPSERT_FACT = """
insert into public.facts
  (id, subject_kind, subject_id, predicate_code, object_kind, object_id,
   start_date, start_precision, end_date, end_precision, qualifier, amount, attrs,
   certainty, status, visibility, revision_of, no_source)
values (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s::jsonb, %s, %s, %s, %s, %s)
on conflict (id) do update set
  subject_kind = excluded.subject_kind, subject_id = excluded.subject_id,
  predicate_code = excluded.predicate_code, object_kind = excluded.object_kind,
  object_id = excluded.object_id, start_date = excluded.start_date,
  start_precision = excluded.start_precision, end_date = excluded.end_date,
  end_precision = excluded.end_precision, qualifier = excluded.qualifier,
  amount = excluded.amount, attrs = excluded.attrs, certainty = excluded.certainty,
  status = excluded.status, visibility = excluded.visibility,
  revision_of = excluded.revision_of, no_source = excluded.no_source
"""

SQL_UPSERT_STANCE = """
insert into public.stances
  (id, party_org_id, axis_code, value, target_org_id, start_date, start_precision,
   end_date, end_precision, status, visibility, notes)
values (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
on conflict (id) do update set
  party_org_id = excluded.party_org_id, axis_code = excluded.axis_code,
  value = excluded.value, target_org_id = excluded.target_org_id,
  start_date = excluded.start_date, start_precision = excluded.start_precision,
  end_date = excluded.end_date, end_precision = excluded.end_precision,
  status = excluded.status, visibility = excluded.visibility, notes = excluded.notes
"""

SQL_UPSERT_SOURCE = """
insert into public.sources
  (id, kind, title, author, url, page, quote, published_at, accessed_at)
values (%s, %s, %s, %s, %s, %s, %s, %s, %s)
on conflict (id) do update set
  kind = excluded.kind, title = excluded.title, author = excluded.author,
  url = excluded.url, page = excluded.page, quote = excluded.quote,
  published_at = excluded.published_at, accessed_at = excluded.accessed_at
"""


def _dsn() -> str:
    dsn = os.environ.get("DATABASE_URL") or os.environ.get("SUPABASE_DB_URL")
    if not dsn:
        raise SystemExit("DATABASE_URL is not set (Supabase → Connect → Session pooler URI)")
    return dsn


def import_bundle(bundle: Bundle, dsn: str | None = None) -> dict[str, int]:
    """Write a validated bundle; returns row counts per table."""
    import psycopg  # imported lazily so --dry-run works without the DB driver

    counts = {"relation_types": 0, "stance_axes": 0, "orgs": 0, "persons": 0,
              "facts": 0, "sources": 0, "fact_sources": 0, "stances": 0}
    source_ids: set[str] = set()

    with psycopg.connect(dsn or _dsn()) as conn:
        with conn.cursor() as cur:
            for rt in bundle.relation_types:
                cur.execute(SQL_UPSERT_RELATION_TYPE, (
                    rt["code"], rt["label_zh"], rt["label_en"],
                    rt.get("subject_kinds") or [], rt.get("object_kinds") or [],
                    rt.get("implied_parent", False), json.dumps(rt.get("attrs_schema") or {}),
                    rt.get("is_active", True),
                ))
                counts["relation_types"] += 1
            for ax in bundle.stance_axes:
                cur.execute(SQL_UPSERT_AXIS, (
                    ax["code"], ax["label_zh"], ax["label_en"],
                    ax["scale_min"], ax["scale_max"], json.dumps(ax.get("anchors") or {}),
                ))
                counts["stance_axes"] += 1
            for org in bundle.orgs:
                cur.execute(SQL_UPSERT_ORG, (
                    org["id"], org["name"], org.get("kind", "company"), org.get("country_code"),
                    org.get("founded_date"), org.get("founded_precision", "unknown"),
                    org.get("dissolved_date"), org.get("dissolved_precision", "unknown"),
                    org.get("visibility", "public"), org.get("notes"),
                ))
                counts["orgs"] += 1
            for person in bundle.persons:
                cur.execute(SQL_UPSERT_PERSON, (
                    person["id"], person["name"], person.get("aliases") or [],
                    person.get("country_code"), person.get("birth_date"),
                    person.get("birth_precision", "unknown"), person.get("death_date"),
                    person.get("death_precision", "unknown"), person.get("visibility", "public"),
                    person.get("notes"),
                ))
                counts["persons"] += 1
            for fact in bundle.facts:
                cur.execute(SQL_UPSERT_FACT, (
                    fact["id"], fact["subject_kind"], fact["subject_id"], fact["predicate_code"],
                    fact.get("object_kind"), fact.get("object_id"),
                    fact.get("start_date"), fact.get("start_precision", "unknown"),
                    fact.get("end_date"), fact.get("end_precision", "unknown"),
                    fact.get("qualifier", "exact"), fact.get("amount"),
                    json.dumps(fact.get("attrs") or {}), fact.get("certainty", "exact"),
                    fact.get("status", "draft"), fact.get("visibility", "public"),
                    fact.get("revision_of"), bool(fact.get("no_source", False)),
                ))
                counts["facts"] += 1
                for source in fact.get("sources") or []:
                    source_id = source.get("id") or str(uuid.uuid5(uuid.NAMESPACE_URL, source.get("url") or source["title"]))
                    if source_id not in source_ids:
                        cur.execute(SQL_UPSERT_SOURCE, (
                            source_id, source.get("kind", "article"), source["title"],
                            source.get("author"), source.get("url"), source.get("page"),
                            source.get("quote"), source.get("published_at"), source.get("accessed_at"),
                        ))
                        source_ids.add(source_id)
                        counts["sources"] += 1
                    cur.execute(
                        "insert into public.fact_sources (fact_id, source_id, locator) "
                        "values (%s, %s, %s) on conflict do nothing",
                        (fact["id"], source_id, source.get("locator")),
                    )
                    counts["fact_sources"] += 1
            for stance in bundle.stances:
                cur.execute(SQL_UPSERT_STANCE, (
                    stance["id"], stance["party_org_id"], stance["axis_code"], stance["value"],
                    stance.get("target_org_id"), stance.get("start_date"),
                    stance.get("start_precision", "unknown"), stance.get("end_date"),
                    stance.get("end_precision", "unknown"), stance.get("status", "draft"),
                    stance.get("visibility", "public"), stance.get("notes"),
                ))
                counts["stances"] += 1
            cur.execute(
                "insert into public.audit_log (entity, action, summary) "
                "values ('seed', 'seed', %s::jsonb)",
                (json.dumps(counts),),
            )
    return counts


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Validate and import a Meta Pedigree seed bundle.")
    parser.add_argument("--data", type=Path, default=Path("seed/data"), help="bundle directory")
    parser.add_argument("--dry-run", action="store_true", help="validate only, no database")
    args = parser.parse_args(argv)

    bundle, issues = load_bundle(args.data)
    issues.extend(validate(bundle))
    for issue in issues:
        print(issue, file=sys.stderr)
    blocking = errors(issues)
    if blocking:
        print(f"{len(blocking)} error(s); nothing imported.", file=sys.stderr)
        return 1
    summary = {key: len(getattr(bundle, key)) for key in BUNDLE_KEYS if getattr(bundle, key)}
    print(f"validated: {summary}")
    if args.dry_run:
        return 0
    counts = import_bundle(bundle)
    print(f"imported: {counts}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
