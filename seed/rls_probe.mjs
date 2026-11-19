#!/usr/bin/env node
// RLS probe for Meta Pedigree (T-002, DR-0006).
//
// Proves through PostgREST — the exact path the SPA uses — that
//   * anon cannot insert, update or delete, and reads nothing;
//   * the service role can create, read, update and delete its fixture row.
//
// What "refused" actually looks like in PostgREST, and why both shapes count:
//   * privileges revoked (this schema)  -> HTTP 401/403 on every verb
//   * privileges granted, RLS only      -> INSERT 401/403; SELECT/UPDATE/DELETE 200 + 0 rows
// So the anon checks accept either an error status or a zero-row answer.
//
// Reads SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY from the
// environment or the repo-root .env. Prints one PASS/FAIL line per check.
//
// Usage: node seed/rls_probe.mjs [--keep]
//        --keep   leave the fixture row behind (debugging); default removes it.

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function loadEnv() {
  try {
    for (const raw of readFileSync(join(root, ".env"), "utf8").split("\n")) {
      const match = raw.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (match && !process.env[match[1]]) {
        process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
      }
    }
  } catch {
    // no .env: rely on the environment
  }
}
loadEnv();

const url = (process.env.SUPABASE_URL || "").replace(/\/$/, "");
const anonKey = process.env.SUPABASE_ANON_KEY || "";
const serviceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || "";
const missing = [
  !url && "SUPABASE_URL",
  !anonKey && "SUPABASE_ANON_KEY",
  !serviceKey && "SUPABASE_SERVICE_ROLE_KEY",
].filter(Boolean);
if (missing.length) {
  console.error(`missing env: ${missing.join(", ")} (put them in the repo-root .env)`);
  process.exit(2);
}

const FIXTURE = "01900000-0000-7000-8000-00000000beef";
const fixtureRow = { id: FIXTURE, name: "RLS probe fixture", kind: "other", visibility: "hidden" };

async function call(key, path, { method = "GET", body, prefer } = {}) {
  const headers = { apikey: key, "Content-Type": "application/json" };
  // Supabase's newer sb_secret_/sb_publishable_ keys go in apikey only; JWTs also sign the JWT.
  if (key.split(".").length === 3) headers.Authorization = `Bearer ${key}`;
  if (prefer) headers.Prefer = prefer;
  let response;
  try {
    response = await fetch(`${url}/rest/v1/${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (err) {
    return { status: 0, json: null, text: `network error: ${err?.cause?.message || err}` };
  }
  const text = await response.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return { status: response.status, json, text };
}

const results = [];
function check(name, ok, detail) {
  results.push({ name, ok });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok || !detail ? "" : `  — ${detail}`}`);
}

// "Refused" has two shapes: our migration revokes table grants from anon, so
// PostgREST answers 401/403; without the revoke but with RLS only, UPDATE/DELETE
// would answer 200 with zero rows. Both are safe, so accept either.
function refused(result) {
  if ([401, 403].includes(result.status)) return true;
  return result.status === 200 && (result.json || []).length === 0;
}

const anonInsert = await call(anonKey, "orgs", {
  method: "POST", body: fixtureRow, prefer: "return=minimal",
});
check("anon cannot INSERT", refused(anonInsert),
  `status ${anonInsert.status}: ${anonInsert.text.slice(0, 160)}`);

const anonSelect = await call(anonKey, `orgs?select=id&id=eq.${FIXTURE}`);
check("anon cannot SELECT", refused(anonSelect),
  `status ${anonSelect.status}, ${(anonSelect.json || []).length} row(s)`);

const anonUpdate = await call(anonKey, `orgs?id=eq.${FIXTURE}`, {
  method: "PATCH", body: { name: "tampered by anon" }, prefer: "return=representation",
});
check("anon cannot UPDATE", refused(anonUpdate),
  `status ${anonUpdate.status}, ${(anonUpdate.json || []).length} row(s)`);

const anonDelete = await call(anonKey, `orgs?id=eq.${FIXTURE}`, {
  method: "DELETE", prefer: "return=representation",
});
check("anon cannot DELETE", refused(anonDelete),
  `status ${anonDelete.status}, ${(anonDelete.json || []).length} row(s)`);

let cleaned = false;
async function cleanup() {
  if (cleaned) return;
  cleaned = true;
  await call(serviceKey, `orgs?id=eq.${FIXTURE}`, { method: "DELETE" });
}

try {
  const insert = await call(serviceKey, "orgs", { method: "POST", body: fixtureRow, prefer: "return=minimal" });
  check("service_role can INSERT", insert.status === 201,
    `status ${insert.status}: ${insert.text.slice(0, 160)}`);

  const select = await call(serviceKey, `orgs?select=id,name&id=eq.${FIXTURE}`);
  check("service_role can SELECT", select.status === 200 && (select.json || []).length === 1,
    `status ${select.status}, ${(select.json || []).length} row(s)`);

  const update = await call(serviceKey, `orgs?id=eq.${FIXTURE}`, {
    method: "PATCH", body: { name: "RLS probe fixture (updated)" }, prefer: "return=representation",
  });
  check("service_role can UPDATE", update.status === 200 && update.json?.[0]?.name === "RLS probe fixture (updated)",
    `status ${update.status}`);

  const remove = await call(serviceKey, `orgs?id=eq.${FIXTURE}`, {
    method: "DELETE", prefer: "return=representation",
  });
  check("service_role can DELETE", remove.status === 200 && (remove.json || []).length === 1,
    `status ${remove.status}, ${(remove.json || []).length} row(s)`);
} finally {
  if (!process.argv.includes("--keep")) await cleanup();
}

const failed = results.filter((result) => !result.ok).length;
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exit(failed === 0 ? 0 : 1);
