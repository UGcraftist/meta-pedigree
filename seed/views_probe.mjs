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

const nodes = await get("tree_nodes?select=id,name,depth,is_root,child_count&order=depth.asc,name.asc&limit=200");
const edges = await get("tree_edges?select=parent_org_id,child_org_id,predicate_code,relation_date&limit=200");
const detail = await get("org_detail?select=id,name,facts&limit=50");

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
      const res = await fetch(`${url}/rest/v1/${view}?select=id&limit=1`, {
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
