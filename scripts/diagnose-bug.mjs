// Диагностика бага с selected_techniques: тянет данные из Supabase напрямую
// через PostgREST + service role key.
//
// Usage: node scripts/diagnose-bug.mjs

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(here, "..", ".env.local");
const env = Object.fromEntries(
  readFileSync(envPath, "utf8")
    .split("\n")
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, "")];
    })
);

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing SUPABASE_URL or SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const TEST_26_ID = "6a203b5f-4a41-4cff-bd88-e2cc6772110a";
const TEST_27_ID = "f7c2048c-2cb0-4469-ba4a-5f19e64bc451";

async function sb(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      Accept: "application/json",
    },
  });
  if (!res.ok) {
    throw new Error(`${path}: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

function brief(s, n = 120) {
  if (typeof s !== "string") s = JSON.stringify(s);
  if (!s) return "(empty)";
  return s.length > n ? s.slice(0, n) + "…" : s;
}

async function dumpProject(label, id) {
  console.log(`\n=== ${label} (${id}) ===`);
  const rows = await sb(
    `projects?id=eq.${id}&select=id,name,created_at,updated_at,analysis_status,selected_segment_ids,selected_techniques,analysis`
  );
  if (!rows[0]) {
    console.log("  NOT FOUND");
    return null;
  }
  const p = rows[0];
  console.log(`  name:            ${p.name}`);
  console.log(`  created_at:      ${p.created_at}`);
  console.log(`  updated_at:      ${p.updated_at}`);
  console.log(`  analysis_status: ${p.analysis_status}`);
  console.log(`  selected_techniques:`);
  console.log("   ", JSON.stringify(p.selected_techniques, null, 2)?.replace(/\n/g, "\n    "));
  console.log(`  analysis keys:   ${p.analysis ? Object.keys(p.analysis).join(", ") : "(null)"}`);
  if (p.analysis) {
    console.log(`  analysis.business.niche: ${brief(p.analysis.business?.niche)}`);
    console.log(`  analysis.segments[]:     ${(p.analysis.segments ?? []).length} items`);
    console.log(`  analysis.selected_techniques: ${"selected_techniques" in p.analysis ? JSON.stringify(p.analysis.selected_techniques) : "(absent)"}`);
  }
  return p;
}

async function main() {
  await dumpProject("ТЕСТ-26 (работал)", TEST_26_ID);
  await dumpProject("ТЕСТ-27 (сломан)", TEST_27_ID);

  console.log("\n=== usage_log по этим проектам (operation=analyze_project) ===");
  const logs = await sb(
    `usage_log?project_id=in.(${TEST_26_ID},${TEST_27_ID})&operation=eq.analyze_project&select=project_id,model,input_tokens,output_tokens,created_at&order=created_at.asc`
  );
  console.table(logs);

  console.log("\n=== Все последние 10 проектов с analysis_status=ready и состоянием selected_techniques ===");
  const recent = await sb(
    `projects?analysis_status=eq.ready&order=updated_at.desc&limit=15&select=id,name,updated_at,selected_techniques`
  );
  for (const r of recent) {
    const t = r.selected_techniques ?? {};
    const sizes = `t=${(t.triggers ?? []).length} f=${(t.formulas ?? []).length} s=${(t.structures ?? []).length} r=${t.reasoning ? "Y" : "N"}`;
    console.log(`  ${r.updated_at}  ${r.name.padEnd(30)} ${sizes}`);
  }

  console.log("\n=== knowledge_base counts ===");
  const kb = await sb(
    "knowledge_base?is_active=eq.true&select=entry_type"
  );
  const tally = {};
  for (const r of kb) tally[r.entry_type] = (tally[r.entry_type] ?? 0) + 1;
  console.log(" ", tally);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
