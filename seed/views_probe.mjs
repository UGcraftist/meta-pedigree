#!/usr/bin/env node
// Sanity check for the 0002 read-model views (T-004). Run after pasting
// 0002_read_model.sql into the dev SQL editor: `make views-probe`.
// Uses service_role (bypasses RLS) to prove the view SQL itself works —
// RLS is enforced by security_invoker and covered by `make probe`.
import { readFileSync } from "node:fs";

const env = {};
try {
  for (const line of readFileSync(new URL("../.env", import.meta.url), "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^"|"$/g, "");
  }
} catch {
  console.error("no .env at repo root");
  process.exit(1);
}
const url = (env.SUPABASE_URL ?? "").replace(/\/$/, "");
const key = env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const anon = env.SUPABASE_ANON_KEY ?? "";
if (!url || !key) {
  console.error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
  process.exit(1);
}

async function get(path) {
  const res = await fetch(`${url}/rest/v1/${path}`, {
    headers: { apikey: key, authorization: `Bearer ${key}` },
  });
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status} ${await res.text()}`);
  return res.json();
}

const nodes = await get("tree_nodes?select=*&order=depth.asc,name.asc&limit=200");
const edges = await get("tree_edges?select=*&limit=200");
const detail = await get("org_detail?select=*&limit=50");

// DR-0007:48 — the retired OpenAPI documented these payloads; the contract now
// lives in api.md, so the live response shape is asserted here and in write-probe.
// assertShape requires the named keys and their types but allows extra columns
// (additive changes are fine); depth/is_root are nullable because 0004's left
// join can emit null for an org unreachable from any root.
function fail(msg) {
  console.error(`FAIL: ${msg}`);
  process.exit(1);
}
function checkValue(path, value, type) {
  const ok =
    type === "string|null"
      ? value === null || typeof value === "string"
      : type === "number|null"
        ? value === null || typeof value === "number"
        : type === "boolean|null"
          ? value === null || typeof value === "boolean"
          : typeof value === type;
  if (!ok) fail(`${path}: expected ${type}, got ${value === null ? "null" : typeof value} (${JSON.stringify(value)})`);
}
function assertShape(name, row, shape) {
  if (row === null || typeof row !== "object") fail(`${name}: not an object`);
  for (const key of Object.keys(shape)) {
    if (!(key in row)) fail(`${name}: missing key ${key}`);
    checkValue(`${name}.${key}`, row[key], shape[key]);
  }
}
const NODE_SHAPE = { id: "string", name: "string", kind: "string", country_code: "string|null", founded_date: "string|null", founded_precision: "string", depth: "number|null", is_root: "boolean|null", child_count: "number", parent_count: "number" };
const EDGE_SHAPE = { fact_id: "string", parent_org_id: "string", child_org_id: "string", predicate_code: "string", relation_date: "string|null", start_precision: "string", end_date: "string|null", end_precision: "string", qualifier: "string", amount: "number|null" };
const DETAIL_SHAPE = { id: "string", name: "string", kind: "string", country_code: "string|null", founded_date: "string|null", founded_precision: "string", notes: "string|null" };
const FACT_SHAPE = { id: "string", predicate: "string", label_zh: "string|null", label_en: "string|null", status: "string", conflict_key: "string", subject_kind: "string|null", subject_id: "string|null", subject_name: "string|null", object_kind: "string|null", object_id: "string|null", object_name: "string|null", start_date: "string|null", start_precision: "string", end_date: "string|null", end_precision: "string|null", qualifier: "string|null", amount: "number|null", certainty: "string|null", no_source: "boolean" };
const SOURCE_SHAPE = { title: "string", url: "string|null", kind: "string|null", quote: "string|null", locator: "string|null", author: "string|null", page: "string|null", published_at: "string|null", accessed_at: "string|null" };
for (const n of nodes) assertShape(`tree_nodes[${n.name}]`, n, NODE_SHAPE);
for (const e of edges) assertShape(`tree_edges[${e.fact_id}]`, e, EDGE_SHAPE);
for (const o of detail) {
  assertShape(`org_detail[${o.name}]`, o, DETAIL_SHAPE);
  if (!Array.isArray(o.facts)) fail(`org_detail[${o.name}].facts: not an array`);
  for (const f of o.facts) {
    assertShape(`org_detail[${o.name}].facts[${f.id}]`, f, FACT_SHAPE);
    if (!Array.isArray(f.sources)) fail(`org_detail[${o.name}].facts[${f.id}].sources: not an array`);
    f.sources.forEach((s, i) => assertShape(`org_detail[${o.name}].facts[${f.id}].sources[${i}]`, s, SOURCE_SHAPE));
  }
}
console.log("response shapes: contract keys/types ok");

console.log(`tree_nodes:    ${nodes.length} rows (roots: ${nodes.filter((n) => n.is_root).length})`);
for (const n of nodes) console.log(`  ${"  ".repeat(n.depth)}${n.name} [d${n.depth}]`);
console.log(`tree_edges:    ${edges.length} rows`);
for (const e of edges) console.log(`  ${e.predicate_code} ${e.relation_date ?? "?"} → child ${e.child_org_id}`);
console.log(`org_detail:    ${detail.length} rows`);

const withFacts = detail.filter((o) => o.facts?.length > 0).length;
console.log(`  orgs with facts: ${withFacts}/${detail.length}`);
const sourced = detail.flatMap((o) => o.facts ?? []).filter((f) => f.sources?.some((s) => s.url));
console.log(`  facts with a URL source: ${sourced.length}`);
const missing = Number(detail.find((o) => o.name === "Boston Dynamics")?.facts?.length ?? 0) === 0;
// T-006 (0005): both ends of a fact are resolved in the view, not by the client.
// Seed fact: "Boston Dynamics · controlled_by · Hyundai Motor Group" — Boston
// Dynamics is the SUBJECT, so its drawer is the object-side case that round 2
// blocked on. Assert the resolved ends on BD's own row.
const bd = detail.find((o) => o.name === "Boston Dynamics");
const controlled = (bd?.facts ?? []).find(
  (f) =>
    f.predicate === "controlled_by" &&
    f.subject_name === "Boston Dynamics" &&
    f.object_name === "Hyundai Motor Group",
);
if (!controlled) {
  console.error("FAIL: org_detail lacks Boston Dynamics controlled_by Hyundai Motor Group (0005 not applied?)");
  process.exit(1);
}
if (!controlled.subject_id || !controlled.object_id) {
  console.error(`FAIL: both ends must be visible here (subject_id=${controlled.subject_id}, object_id=${controlled.object_id})`);
  process.exit(1);
}
// A fact with no object end must not fabricate one (founded has object_kind null).
const founded = (bd?.facts ?? []).find((f) => f.predicate === "founded");
if (!founded) {
  console.error("FAIL: org_detail lacks a founded fact for Boston Dynamics");
  process.exit(1);
}
if (founded.object_kind !== null || founded.object_id !== null) {
  console.error(`FAIL: founded fact must have no object end (object_kind=${founded.object_kind}, object_id=${founded.object_id})`);
  process.exit(1);
}
// T-010 (CR-010): a disputed pair and its group must be visible, and the
// provenance fields must actually be populated — a shape check that only sees
// nulls would pass on an empty fixture (log.md:27 "assertion that cannot fail").
const bdFacts = bd?.facts ?? [];
const EXPECTED_CONFLICT_ROWS = 3;
const disputed = bdFacts.filter((f) => f.predicate === "founded" && f.status === "disputed");
if (disputed.length < 2) {
  console.error(`FAIL: expected at least two disputed founded facts for Boston Dynamics, found ${disputed.length}`);
  process.exit(1);
}
const conflictGroup = bdFacts.filter((f) => f.predicate === "founded" && f.conflict_key === disputed[0].conflict_key);
if (conflictGroup.length !== EXPECTED_CONFLICT_ROWS) {
  console.error(`FAIL: conflict group for Boston Dynamics founded must have ${EXPECTED_CONFLICT_ROWS} rows, found ${conflictGroup.length}`);
  process.exit(1);
}
if (!conflictGroup.some((f) => f.status === "published") || disputed.some((d) => !conflictGroup.includes(d))) {
  console.error("FAIL: conflict group must contain the published row and both disputed rows");
  process.exit(1);
}
if (!conflictGroup.some((f) => f.status === "disputed" && f.no_source === true)) {
  console.error("FAIL: conflict group lacks the 争议 + 无来源 row (FR-001/FR-004 combined state)");
  process.exit(1);
}
const ranged = bdFacts.find((f) => f.end_date && f.end_precision === "year");
if (!ranged) {
  console.error("FAIL: fixture lacks a year-precision range fact (end_date/end_precision unexercised)");
  process.exit(1);
}
const noSource = bdFacts.concat(detail.flatMap((o) => o.facts ?? [])).filter((f) => f.no_source === true);
if (noSource.length === 0) {
  console.error("FAIL: fixture lacks a no_source fact (FR-001 label unverifiable)");
  process.exit(1);
}
const populatedSources = detail
  .flatMap((o) => o.facts ?? [])
  .flatMap((f) => f.sources ?? [])
  .filter((s) => s.author && s.locator && s.accessed_at);
if (populatedSources.length === 0) {
  console.error("FAIL: no source has author + locator + accessed_at (FR-001 as-of unverifiable)");
  process.exit(1);
}
console.log(`  conflict group: ${conflictGroup.length} rows for one conflict_key (incl. 无来源); range fact: ${ranged.predicate} ${ranged.start_date}–${ranged.end_date}; provenance populated on ${populatedSources.length} source(s)`);

// security.md:33 — an anon caller must not read org_detail at all.
if (!anon) {
  if (!process.argv.includes("--allow-anon-skip")) {
    console.error("FAIL: SUPABASE_ANON_KEY is not set; anon denial is unchecked (pass --allow-anon-skip to skip)");
    process.exit(1);
  }
  console.log("  anon org_detail access: SKIPPED (--allow-anon-skip)");
} else {
  for (const view of ["org_detail", "tree_edges", "tree_nodes"]) {
    let anonStatus = 0;
    try {
      const res = await fetch(`${url}/rest/v1/${view}?limit=1`, {
        headers: { apikey: anon, authorization: `Bearer ${anon}` },
      });
      anonStatus = res.status;
    } catch {
      anonStatus = -1;
    }
    if (anonStatus !== 401 && anonStatus !== 403) {
      console.error(`FAIL: anon read ${view} returned ${anonStatus}, expected 401/403 (grant regression)`);
      process.exit(1);
    }
    console.log(`  anon ${view} access: ${anonStatus} (denied, as required)`);
  }
  // facts_for is exposed as an RPC; anon must be refused by the missing execute grant.
  let rpcStatus = 0;
  try {
    const res = await fetch(`${url}/rest/v1/rpc/facts_for`, {
      method: "POST",
      headers: { apikey: anon, authorization: `Bearer ${anon}`, "content-type": "application/json" },
      body: JSON.stringify({ p_object_id: "00000000-0000-0000-0000-000000000000" }),
    });
    rpcStatus = res.status;
  } catch {
    rpcStatus = -1;
  }
  if (rpcStatus !== 401 && rpcStatus !== 403) {
    console.error(`FAIL: anon rpc/facts_for returned ${rpcStatus}, expected 401/403 (execute grant regression)`);
    process.exit(1);
  }
  console.log(`  anon rpc/facts_for access: ${rpcStatus} (denied, as required)`);
}
// The app reads the views as `authenticated`, not as service_role. That path
// is the standing drift detector until CLI `db diff` lands (CR-006 Phase 2).
const editorEmail = env.SUPABASE_EDITOR_EMAIL;
const editorPassword = env.SUPABASE_EDITOR_PASSWORD;
if (!editorEmail || !editorPassword) {
  console.log("  authenticated views: SKIPPED (set SUPABASE_EDITOR_EMAIL/PASSWORD to cover the app role)");
} else {
  const tokenRes = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: anon, "Content-Type": "application/json" },
    body: JSON.stringify({ email: editorEmail, password: editorPassword }),
  });
  if (!tokenRes.ok) {
    console.error(`FAIL: editor sign-in failed (${tokenRes.status}); set the editor password in .env`);
    process.exit(1);
  }
  const { access_token: token } = await tokenRes.json();
  for (const view of ["tree_nodes", "tree_edges", "org_detail"]) {
    const res = await fetch(`${url}/rest/v1/${view}?limit=1`, {
      headers: { apikey: anon, authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      console.error(`FAIL: authenticated read ${view} returned ${res.status} (${await res.text()})`);
      process.exit(1);
    }
    console.log(`  authenticated ${view} access: 200`);
  }
}
const ids = new Set(nodes.map((n) => n.id));
const duped = ids.size !== nodes.length;
const frankaId = nodes.find((n) => n.name === "Franka Emika")?.id;
const franka = edges.filter((e) => e.child_org_id === frankaId).length; // Franka Emika has two parent edges
if (duped) {
  console.error(`FAIL: tree_nodes has duplicate rows (${nodes.length} rows, ${ids.size} distinct orgs)`);
  process.exit(1);
}
if (nodes.length < 20 || edges.length < 5 || missing || franka < 2) {
  console.error("FAIL: expected ≥20 distinct nodes, ≥5 edges, Boston Dynamics facts, Franka 2 parent edges");
  process.exit(1);
}
console.log("views ok");
