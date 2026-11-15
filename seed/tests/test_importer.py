"""Validation tests for the seed importer (T-002; no database required)."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from seed.importer import Bundle, errors, load_bundle, validate

ORG = "01900000-0000-7000-8000-000000000001"
ORG2 = "01900000-0000-7000-8000-000000000002"
FACT = "01900000-0000-7000-8000-000000000010"


def write_bundle(tmp_path: Path, files: dict[str, dict]) -> Path:
    for name, payload in files.items():
        (tmp_path / name).write_text(json.dumps(payload), encoding="utf-8")
    return tmp_path


def vocab() -> dict:
    return {
        "relation_types": [
            {"code": "acquired", "label_zh": "收购", "label_en": "acquired",
             "subject_kinds": ["org"], "object_kinds": ["org"], "implied_parent": True},
        ],
        "stance_axes": [
            {"code": "left_right", "label_zh": "左右", "label_en": "left-right",
             "scale_min": -2, "scale_max": 2},
        ],
    }


def base_bundle() -> dict:
    return {
        "000-vocabulary.json": vocab(),
        "010-orgs.json": {"orgs": [
            {"id": ORG, "name": "A", "kind": "company", "founded_date": "1998-01-01",
             "founded_precision": "year"},
            {"id": ORG2, "name": "B", "kind": "company"},
        ]},
        "030-facts.json": {"facts": [
            {"id": FACT, "subject_kind": "org", "subject_id": ORG,
             "predicate_code": "acquired", "object_kind": "org", "object_id": ORG2,
             "status": "published",
             "sources": [{"kind": "article", "title": "Deal", "url": "https://example.com/a"}]},
        ]},
    }


def test_valid_bundle_passes(tmp_path: Path):
    bundle, load_issues = load_bundle(write_bundle(tmp_path, base_bundle()))
    issues = load_issues + validate(bundle)
    assert errors(issues) == [], [str(issue) for issue in issues]
    assert len(bundle.orgs) == 2 and len(bundle.facts) == 1


def test_dangling_subject_is_rejected_and_named(tmp_path: Path):
    files = base_bundle()
    files["030-facts.json"] = {"facts": [dict(files["030-facts.json"]["facts"][0],
                                              subject_id="01900000-0000-7000-8000-0000000000ff")]}
    bundle, _ = load_bundle(write_bundle(tmp_path, files))
    messages = [str(issue) for issue in errors(validate(bundle))]
    assert any("dangling subject id 01900000-0000-7000-8000-0000000000ff" in message for message in messages)


def test_published_fact_without_source_is_rejected(tmp_path: Path):
    files = base_bundle()
    files["030-facts.json"] = {"facts": [dict(files["030-facts.json"]["facts"][0], sources=[])]}
    bundle, _ = load_bundle(write_bundle(tmp_path, files))
    messages = [str(issue) for issue in errors(validate(bundle))]
    assert any("needs a source or no_source=true" in message for message in messages)


def test_year_precision_requires_january_first(tmp_path: Path):
    files = base_bundle()
    files["010-orgs.json"] = {"orgs": [{"id": ORG, "name": "A", "founded_date": "1998-04-01",
                                        "founded_precision": "year"}]}
    bundle, _ = load_bundle(write_bundle(tmp_path, files))
    messages = [str(issue) for issue in errors(validate(bundle))]
    assert any("Jan 1 for year precision" in message for message in messages)


def test_unknown_precision_forbids_a_date(tmp_path: Path):
    files = base_bundle()
    files["010-orgs.json"] = {"orgs": [{"id": ORG, "name": "A", "founded_date": "1998-01-01"}]}
    bundle, _ = load_bundle(write_bundle(tmp_path, files))
    messages = [str(issue) for issue in errors(validate(bundle))]
    assert any("founded_date set while founded_precision is 'unknown'" in message for message in messages)


def test_unknown_predicate_is_rejected(tmp_path: Path):
    files = base_bundle()
    files["030-facts.json"] = {"facts": [dict(files["030-facts.json"]["facts"][0],
                                              predicate_code="teleported")]}
    bundle, _ = load_bundle(write_bundle(tmp_path, files))
    messages = [str(issue) for issue in errors(validate(bundle))]
    assert any("dangling predicate code 'teleported'" in message for message in messages)


def test_relation_kind_mismatch_is_rejected(tmp_path: Path):
    files = base_bundle()
    files["030-facts.json"] = {"facts": [dict(files["030-facts.json"]["facts"][0],
                                              subject_kind="person",
                                              subject_id="01900000-0000-7000-8000-0000000000aa")]}
    files["020-persons.json"] = {"persons": [{"id": "01900000-0000-7000-8000-0000000000aa", "name": "P"}]}
    bundle, _ = load_bundle(write_bundle(tmp_path, files))
    messages = [str(issue) for issue in errors(validate(bundle))]
    assert any("does not accept subject_kind 'person'" in message for message in messages)


def test_stance_outside_axis_range_is_rejected(tmp_path: Path):
    files = base_bundle()
    files["040-stances.json"] = {"stances": [
        {"id": "01900000-0000-7000-8000-0000000000b1", "party_org_id": ORG,
         "axis_code": "left_right", "value": 9},
    ]}
    bundle, _ = load_bundle(write_bundle(tmp_path, files))
    messages = [str(issue) for issue in errors(validate(bundle))]
    assert any("outside axis range" in message for message in messages)


def test_duplicate_ids_are_rejected(tmp_path: Path):
    files = base_bundle()
    files["011-orgs-again.json"] = {"orgs": [{"id": ORG, "name": "A copy"}]}
    bundle, _ = load_bundle(write_bundle(tmp_path, files))
    messages = [str(issue) for issue in errors(validate(bundle))]
    assert any("duplicate id" in message for message in messages)


def test_unknown_top_level_key_is_rejected(tmp_path: Path):
    files = base_bundle()
    files["099-typo.json"] = {"organizations": []}
    bundle, load_issues = load_bundle(write_bundle(tmp_path, files))
    assert any("unknown top-level keys" in str(issue) for issue in load_issues)
    assert len(bundle.orgs) == 2
