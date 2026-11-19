#!/usr/bin/env node
// Write-path probe for 0006_write_rpc (T-007). Run after pasting the migration:
//   make write-probe
//
// Proves through PostgREST, the same path the SPA uses:
//   * anon cannot call any write RPC, and the refusal leaves row counts unchanged;
//   * an authenticated NON-editor cannot write either, again with row counts;
//   * the editor can create a fact with a nested source, dedupe a second variant
//     of the same URL, is refused for a dangling id / missing precision / amount
//     outside controlled_by (and nothing leaks), publishes only with a source or
//     no_source, writes exactly one audit row (actor id + email, old→new), and the
//     published fact is visible in org_detail read back with the editor JWT;
//   * duplicate sources merge only when normalized URLs are equal; the negative
//     case leaves both rows in place.
//
// Needs SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, and the two
// app accounts: SUPABASE_EDITOR_EMAIL/PASSWORD (role=editor) and
// SUPABASE_READONLY_EMAIL/PASSWORD (authenticated, not editor). Without the
// accounts the probe SKIPS loudly and exits 0 instead of claiming a pass.
//
// Fact/source rows are cleaned up afterwards; audit_log rows stay (append-only
// by design, 0001_init.sql audit_log_no_update).

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const env = {};
try {
  for (const line of readFileSync(join(root, ".env"), "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) env[m[1]] = m[2].replace(/^['"]|['"]$/g, "");
  }
} catch {
  console.error("no .env at repo root");
  process.exit(1);
}
Object.assign(env, Object.fromEntries(Object.entries(process.env).filter(([, v]) => v)));

const url = (env.SUPABASE_URL || "").replace(/\/$/, "");
const anon = env.SUPABASE_ANON_KEY || "";
const service = env.SUPABASE_SERVICE_ROLE_KEY || "";
if (!url || !anon || !service) {
  console.error("SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY are required");
  process.exit(2);
}

const editorEmail = env.SUPABASE_EDITOR_EMAIL;
const editorPassword = env.SUPABASE_EDITOR_PASSWORD;
const readonlyEmail = env.SUPABASE_READONLY_EMAIL;
const readonlyPassword = env.SUPABASE_READONLY_PASSWORD;
if (!editorEmail || !editorPassword || !readonlyEmail || !readonlyPassword) {
  console.log("SKIPPED: set SUPABASE_EDITOR_EMAIL/PASSWORD and SUPABASE_READONLY_EMAIL/PASSWORD in .env");
  console.log("  (editor = app_metadata.role 'editor'; readonly = anon authenticated account)");
  process.exit(0);
}

const failures = [];
function fail(msg) {
  console.error(`FAIL: ${msg}`);
  failures.push(msg);
}
function ok(msg) {
  console.log(`  ok  ${msg}`);
}
const svcHeaders = { apikey: service, Authorization: `Bearer ${service}`, "Content-Type": "application/json" };

async function call(key, path, { method = "GET", body, token, headers = {} } = {}) {
  const h = { apikey: key, "Content-Type": "application/json", ...headers };
  if (token) h.Authorization = `Bearer ${token}`;
  let res;
  try {
    res = await fetch(`${url}/rest/v1/${path}`, {
      method,
      headers: h,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (err) {
    return { status: 0, json: null, text: `network error: ${err?.cause?.message || err}` };
  }
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return { status: res.status, json, text };
}

async function signIn(email, password) {
  const res = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: anon, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    console.error(`FAIL: sign-in failed for ${email} (${res.status}); check the password in .env`);
    process.exit(1);
  }
  const body = await res.json();
  return { token: body.access_token, uid: body.user.id };
}

const svc = (path, opts = {}) => call(service, path, { ...opts, token: service });
const denied = (r) => [401, 403, 404].includes(r.status) || r.json?.code === "42501";

// exact count via Content-Range, not by counting a capped array
async function countFacts() {
  const res = await fetch(`${url}/rest/v1/facts?select=id&limit=1`, {
    headers: { ...svcHeaders, Prefer: "count=exact", Range: "0-0" },
  });
  const cr = res.headers.get("content-range") || "";
  const n = Number(cr.split("/")[1]);
  return Number.isFinite(n) ? n : -1;
}

// mirrors public.normalize_url (0006): trim, strip fragment, lower scheme+host,
// drop :80/:443, no trailing slash on an empty path
function normUrl(u) {
  if (u == null) return null;
  let v = u.trim().replace(/#.*$/, "");
  const m = v.match(/^([Hh][Tt][Tt][Pp][Ss]?):\/\/([^/?]*)(.*)$/);
  if (!m) return v;
  let scheme = m[1].toLowerCase();
  let authority = m[2].toLowerCase();
  let rest = m[3];
  if (scheme === "http") authority = authority.replace(/:80$/, "");
  else authority = authority.replace(/:443$/, "");
  if (rest === "/") rest = "";
  return `${scheme}://${authority}${rest}`;
}

async function sourceCountFor(rawUrl) {
  // exact count via Content-Range; the stored URL is already normalized (0006)
  const target = normUrl(rawUrl);
  const res = await fetch(
    `${url}/rest/v1/sources?select=id&url=eq.${encodeURIComponent(target)}&limit=1`,
    { headers: { ...svcHeaders, Prefer: "count=exact", Range: "0-0" } },
  );
  const cr = res.headers.get("content-range") || "";
  const n = Number(cr.split("/")[1]);
  return Number.isFinite(n) ? n : -1;
}

// ── 1. anon ────────────────────────────────────────────────────────────────
{
  const before = await countFacts();
  const res = await call(anon, "rpc/upsert_fact", {
    method: "POST",
    body: { payload: { subject_kind: "org", subject_id: randomUUID(), predicate_code: "related_to" } },
  });
  if (denied(res)) ok(`anon upsert_fact denied (HTTP ${res.status}${res.json?.code ? `, ${res.json.code}` : ""})`);
  else fail(`anon upsert_fact was NOT denied (HTTP ${res.status})`);
  const after = await countFacts();
  if (before >= 0 && after === before) ok(`facts count unchanged after anon denial (${before})`);
  else fail(`facts count changed after anon denial (${before} → ${after})`);
}

// ── 2. authenticated non-editor ────────────────────────────────────────────
const readonly = await signIn(readonlyEmail, readonlyPassword);
const beforeReadonly = await countFacts();
{
  const res = await call(anon, "rpc/submit_fact", {
    method: "POST",
    token: readonly.token,
    body: { p_fact: randomUUID() },
  });
  if (res.status === 403 || res.json?.code === "42501") {
    ok("readonly user submit_fact denied (42501)");
  } else {
    fail(`readonly user submit_fact returned HTTP ${res.status}, expected 403/42501`);
  }
  const after = await countFacts();
  if (beforeReadonly >= 0 && after === beforeReadonly) ok(`facts count unchanged after readonly denial (${beforeReadonly})`);
  else fail(`facts count changed after readonly denial (${beforeReadonly} → ${after})`);
}
{
  const res = await call(anon, "rpc/upsert_fact", {
    method: "POST",
    token: readonly.token,
    body: { payload: { subject_kind: "org", subject_id: randomUUID(), predicate_code: "related_to" } },
  });
  if (res.status === 403 || res.json?.code === "42501") ok("readonly user upsert_fact denied (42501)");
  else fail(`readonly user upsert_fact returned HTTP ${res.status}, expected 403/42501`);
}

// ── 3. editor: create + nested source + URL dedupe ────────────────────────
const editor = await signIn(editorEmail, editorPassword);
const orgsRes = await svc("orgs?select=id,name&visibility=eq.public&order=name.asc&limit=2");
const orgs = Array.isArray(orgsRes.json) ? orgsRes.json : [];
if (orgs.length < 2) {
  console.error("FAIL: need at least two public orgs; run make seed first");
  process.exit(1);
}
const [subject, object] = orgs;

const PROBE_URL = "https://Example.com:443/write-probe#frag";
const PROBE_URL_VARIANT = " HTTPS://EXAMPLE.COM:443/write-probe#other ";

const payload = {
  subject_kind: "org",
  subject_id: subject.id,
  predicate_code: "related_to",
  object_kind: "org",
  object_id: object.id,
  attrs: { probe: "t-007" },
  sources: [
    { url: PROBE_URL, title: "T-007 write probe", kind: "article", locator: "§probe" },
  ],
};
const create = await call(anon, "rpc/upsert_fact", {
  method: "POST",
  token: editor.token,
  body: { payload },
});
if (create.status !== 200 || typeof create.json !== "string") {
  console.error(`FAIL: editor upsert_fact failed (HTTP ${create.status}): ${create.text}`);
  process.exit(1);
}
const newFact = create.json;
ok(`editor created draft fact ${newFact} on ${subject.name}`);

// the stored URL is the normalized key (F7), so a first-sighting variant cannot
// hit the case-sensitive sources.url CHECK
{
  const stored = await svc(
    "sources?select=url&url=eq." + encodeURIComponent("https://example.com/write-probe"),
  );
  if (Array.isArray(stored.json) && stored.json.length === 1) ok("source stored normalized");
  else fail(`normalized source row missing (${JSON.stringify(stored.json)})`);
}

// second variant of the same URL must reuse the source row (dedupe by normalized URL)
{
  const res = await call(anon, "rpc/upsert_fact", {
    method: "POST",
    token: editor.token,
    body: { payload: { ...payload, id: newFact, sources: [{ url: PROBE_URL_VARIANT }] } },
  });
  if (res.json === newFact) ok("variant URL updated the same draft (in-place)");
  else fail(`variant URL call returned ${JSON.stringify(res.json)}, expected ${newFact}`);
  const count = await sourceCountFor(PROBE_URL);
  if (count === 1) ok("normalized-URL dedupe keeps exactly one source row");
  else fail(`dedupe left ${count} source rows for the same normalized URL (expected 1)`);
  const link = await svc(`fact_sources?select=source_id&fact_id=eq.${newFact}`);
  if (Array.isArray(link.json) && link.json.length === 1) ok("fact_sources link written in the same transaction");
  else fail(`fact_sources rows = ${link.json?.length}`);
}

// ── 3b. refusals: dangling id named, missing precision, bad amount ────────
{
  const dangling = randomUUID();
  const res = await call(anon, "rpc/upsert_fact", {
    method: "POST",
    token: editor.token,
    body: { payload: { ...payload, subject_id: dangling, sources: [] } },
  });
  const named = typeof res.json?.message === "string" && res.json.message.includes(dangling);
  if (res.json?.code === "23503" && named) ok("dangling subject id rejected and named (23503)");
  else fail(`dangling id not named: HTTP ${res.status} ${res.text}`);
}
{
  const res = await call(anon, "rpc/upsert_fact", {
    method: "POST",
    token: editor.token,
    body: { payload: { ...payload, start_date: "2020-05-01", sources: [] } },
  });
  if (res.json?.code === "23514") ok("date without precision rejected (23514)");
  else fail(`date/precision pairing not enforced: HTTP ${res.status} ${res.text}`);
}
{
  // TH-02: the failure must land AFTER a successful source insert, otherwise a
  // half-write proves nothing. Element 1 is a valid http source; element 2
  // violates sources.url ~ '^https?://' (0001:203), so a surviving row 1 is
  // real evidence of a half-committed statement.
  const unique = `https://example.com/rollback-${randomUUID()}`;
  const res = await call(anon, "rpc/upsert_fact", {
    method: "POST",
    token: editor.token,
    body: {
      payload: {
        ...payload,
        sources: [
          { url: unique, title: "rollback probe" },
          { url: "ftp://nope", title: "invalid scheme" },
        ],
      },
    },
  });
  if (res.json?.code === "23514") ok("invalid source URL rejected (23514)");
  else fail(`invalid source URL not enforced: HTTP ${res.status} ${res.text}`);
  const leaked = await sourceCountFor(unique);
  if (leaked === 0) ok("first source rolled back with the failed statement (TH-02)");
  else fail(`failed insert still wrote ${leaked} source row(s)`);
}
{
  const unique = `https://example.com/amount-${randomUUID()}`;
  const res = await call(anon, "rpc/upsert_fact", {
    method: "POST",
    token: editor.token,
    body: {
      payload: { ...payload, amount: 51, sources: [{ url: unique, title: "amount probe" }] },
    },
  });
  if (res.json?.code === "23514") ok("amount outside controlled_by rejected (23514)");
  else fail(`amount scope not enforced: HTTP ${res.status} ${res.text}`);
}

// 3b2. registry ends: object_kinds empty = no object allowed; non-empty = required
{
  const res = await call(anon, "rpc/upsert_fact", {
    method: "POST",
    token: editor.token,
    body: {
      payload: {
        subject_kind: "org",
        subject_id: subject.id,
        predicate_code: "founded",
        sources: [],
      },
    },
  });
  if (res.status === 200) {
    ok("single-ended predicate (empty object_kinds) accepted without an object");
    await svc(`facts?id=eq.${res.json}`, { method: "DELETE" });
  } else {
    fail(`single-ended predicate rejected (HTTP ${res.status}): ${res.text}`);
  }
}
{
  const res = await call(anon, "rpc/upsert_fact", {
    method: "POST",
    token: editor.token,
    body: {
      payload: {
        subject_kind: "org",
        subject_id: subject.id,
        predicate_code: "related_to",
        sources: [],
      },
    },
  });
  if (res.json?.code === "23514") ok("predicate with non-empty object_kinds requires an object (23514)");
  else fail(`missing object not enforced: HTTP ${res.status} ${res.text}`);
}

// 3c. publish without a source must be refused and write nothing
{
  const bare = await call(anon, "rpc/upsert_fact", {
    method: "POST",
    token: editor.token,
    body: { payload: { ...payload, sources: [] } },
  });
  if (bare.status !== 200) {
    fail(`editor upsert_fact (no source) failed: ${bare.text}`);
  } else {
    const before2 = await countFacts();
    const res = await call(anon, "rpc/submit_fact", {
      method: "POST",
      token: editor.token,
      body: { p_fact: bare.json },
    });
    if (res.json?.code === "23514") {
      ok("publish without source or no_source refused");
    } else {
      fail(`publish without source returned HTTP ${res.status}, expected 23514`);
    }
    const after2 = await countFacts();
    if (after2 === before2) ok("row count unchanged after refused publish");
    else fail(`refused publish changed row count (${before2} → ${after2})`);
    await svc(`facts?id=eq.${bare.json}`, { method: "DELETE" });
  }
}

// 3d. submit
{
  const res = await call(anon, "rpc/submit_fact", {
    method: "POST",
    token: editor.token,
    body: { p_fact: newFact },
  });
  if (res.status === 204 || res.status === 200) ok("editor submitted the fact");
  else fail(`editor submit_fact failed (HTTP ${res.status}): ${res.text}`);
}
{
  const row = await svc(`facts?select=status&id=eq.${newFact}`);
  if (row.json?.[0]?.status === "published") ok("fact is published");
  else fail(`fact status is ${JSON.stringify(row.json?.[0]?.status)}, expected published`);
}
{
  const audit = await svc(
    `audit_log?select=actor_id,actor_email,action,summary&entity=eq.fact&entity_id=eq.${newFact}`,
  );
  const rows = Array.isArray(audit.json) ? audit.json : [];
  const a = rows[0];
  if (rows.length !== 1) fail(`expected exactly 1 audit row, got ${rows.length}`);
  if (!a) fail("no audit_log row for the fact");
  else {
    if (a.actor_id === editor.uid) ok("audit actor_id is the editor uid");
    else fail(`audit actor_id ${a.actor_id} != editor ${editor.uid}`);
    if (a.actor_email === editorEmail) ok("audit actor_email is set from the JWT");
    else fail(`audit actor_email ${a.actor_email} != ${editorEmail}`);
    if (a.action === "publish" && a.summary?.from_status === "draft" && a.summary?.to_status === "published") {
      ok("audit summary carries draft → published");
    } else fail(`audit row unexpected: ${JSON.stringify(a)}`);
  }
}

// 3e. FR-008: the published fact is visible in org_detail read as the editor
{
  const res = await call(anon, `org_detail?select=id,facts&id=eq.${subject.id}`, {
    token: editor.token,
  });
  const facts = Array.isArray(res.json) ? (res.json[0]?.facts ?? []) : [];
  if (res.status === 200 && facts.some((f) => f.id === newFact)) {
    ok("published fact visible in org_detail as the editor (FR-008)");
  } else {
    fail(`published fact not visible in org_detail (HTTP ${res.status})`);
  }
}

// ── 4. stance round-trip (function exists and is editor-only) ─────────────
{
  const axes = await svc("stance_axes?select=code,scale_min,scale_max&limit=1");
  const ax = Array.isArray(axes.json) ? axes.json[0] : null;
  if (!ax) {
    console.log("  skip stance round-trip (no stance_axes rows)");
  } else {
    const value = (Number(ax.scale_min) + Number(ax.scale_max)) / 2;
    const res = await call(anon, "rpc/upsert_stance", {
      method: "POST",
      token: editor.token,
      body: { payload: { party_org_id: subject.id, axis_code: ax.code, value } },
    });
    if (res.status === 200) {
      ok(`editor upsert_stance on ${ax.code}`);
      await svc(`stances?id=eq.${res.json}`, { method: "DELETE" });
    } else {
      fail(`editor upsert_stance failed (HTTP ${res.status}): ${res.text}`);
    }
    const deny = await call(anon, "rpc/upsert_stance", {
      method: "POST",
      token: readonly.token,
      body: { payload: { party_org_id: subject.id, axis_code: ax.code, value } },
    });
    if (deny.status === 403 || deny.json?.code === "42501") ok("readonly user upsert_stance denied");
    else fail(`readonly upsert_stance returned HTTP ${deny.status}, expected 403`);
  }
}

// ── 5. merge_source: positive + negative ─────────────────────────────────
async function insertSource(u) {
  const res = await svc("sources", {
    method: "POST",
    body: { title: "T-007 merge probe", url: u },
    headers: { Prefer: "return=representation" },
  });
  if (res.status !== 201 && res.status !== 200) {
    console.error(`FAIL: source insert failed (HTTP ${res.status}): ${res.text}`);
    process.exit(1);
  }
  return Array.isArray(res.json) ? res.json[0] : res.json;
}
{
  const a = await insertSource("https://Dup.Example.com:443/x#one");
  const b = await insertSource("https://dup.example.com/x");
  const res = await call(anon, "rpc/merge_source", {
    method: "POST",
    token: editor.token,
    body: { p_from: a.id, p_into: b.id },
  });
  if (res.status === 204 || res.status === 200) ok("merge_source merged duplicate sources");
  else fail(`merge_source positive case failed (HTTP ${res.status}): ${res.text}`);
  const left = await svc(`sources?select=id&id=eq.${a.id}`);
  if (Array.isArray(left.json) && left.json.length === 0) ok("merged-away source deleted");
  else fail("merged-away source still present");
  const audit = await svc(`audit_log?select=action&entity=eq.source&entity_id=eq.${b.id}`);
  if (audit.json?.[0]?.action === "merge") ok("merge audited");
  else fail("merge_source did not audit");
  await svc(`sources?id=eq.${b.id}`, { method: "DELETE" });
}
{
  const a = await insertSource("https://dup.example.com/one");
  const b = await insertSource("https://dup.example.com/two");
  const res = await call(anon, "rpc/merge_source", {
    method: "POST",
    token: editor.token,
    body: { p_from: a.id, p_into: b.id },
  });
  if (res.json?.code === "22023") ok("merge_source refuses different paths (22023)");
  else fail(`merge_source negative case returned HTTP ${res.status}, expected 22023`);
  const both = await svc(`sources?select=id&id=in.(${a.id},${b.id})`);
  if (Array.isArray(both.json) && both.json.length === 2) ok("both non-duplicate sources survive");
  else fail("a non-duplicate source was deleted");
  await svc(`sources?id=in.(${a.id},${b.id})`, { method: "DELETE" });
}

// ── cleanup: facts + sources (audit rows stay by design) ──────────────────
await svc(`facts?id=eq.${newFact}`, { method: "DELETE" });
await svc(`sources?url=eq.${encodeURIComponent("https://example.com/write-probe")}`, { method: "DELETE" });
console.log("  note: audit_log rows from this probe are kept (append-only by design)");

if (failures.length) {
  console.error(`\nwrite-probe failed: ${failures.length} check(s)`);
  process.exit(1);
}
console.log("\nwrite path ok");
