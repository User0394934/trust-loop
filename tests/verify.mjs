// Checks the three things this repo actually promises.
//
//   1. every workflow JSON is importable-shaped
//   2. nothing here names a person, an instance or a credential
//   3. the Agent Flight Recorder still produces the fingerprint the docs quote
//
// The third is the one worth having. docs/09 tells a reader to import the
// recorder, press Execute, and expect a834ed58f0de4b1e. That is a promise, and a
// promise nobody re-checks is how this repo previously ended up shipping a
// workflow its own documentation called broken. So CI checks it.
//
// Run: node tests/verify.mjs

import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const EXPECTED_VERDICT = "SUSPECT";
const EXPECTED_FINGERPRINT = "a834ed58f0de4b1e";

let failures = 0;
const fail = (msg) => { console.error("FAIL  " + msg); failures++; };
const pass = (msg) => console.log("ok    " + msg);

// ---------------------------------------------------------------- 1. shape
const workflowFiles = readdirSync(join(ROOT, "workflows")).filter((f) => f.endsWith(".json"));
if (workflowFiles.length === 0) fail("no workflow JSON found");

for (const file of workflowFiles) {
  let wf;
  try {
    wf = JSON.parse(readFileSync(join(ROOT, "workflows", file), "utf8"));
  } catch (e) {
    fail(`${file} is not valid JSON: ${e.message}`);
    continue;
  }
  if (!Array.isArray(wf.nodes) || wf.nodes.length === 0) { fail(`${file} has no nodes`); continue; }
  if (typeof wf.connections !== "object") { fail(`${file} has no connections object`); continue; }

  const names = new Set();
  for (const node of wf.nodes) {
    if (!node.name || !node.type) { fail(`${file} has a node missing name or type`); break; }
    if (names.has(node.name)) { fail(`${file} has duplicate node name "${node.name}"`); break; }
    names.add(node.name);
  }
  for (const [source, conn] of Object.entries(wf.connections)) {
    if (!names.has(source)) fail(`${file} connects from "${source}", which is not a node`);
    for (const output of conn.main ?? []) {
      for (const link of output) {
        if (!names.has(link.node)) fail(`${file} connects to "${link.node}", which is not a node`);
      }
    }
  }
  pass(`${file} — ${wf.nodes.length} nodes, connections resolve`);
}

// ------------------------------------------------------------ 2. anonymity
// The workflows are published from a real instance. Everything that identifies
// it is stripped by hand, and hands forget.
const FORBIDDEN = [
  [/\.app\.n8n\.cloud/i, "a real n8n cloud hostname"],
  [/"id"\s*:\s*"[A-Za-z0-9]{16}"\s*,\s*"name"\s*:\s*"[^"]*"\s*}\s*}/, "an inline credential id"],
  [/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/, "an email address"],
];
for (const dir of ["workflows", "fixtures"]) {
  for (const file of readdirSync(join(ROOT, dir)).filter((f) => f.endsWith(".json"))) {
    const raw = readFileSync(join(ROOT, dir, file), "utf8");
    let clean = true;
    for (const [pattern, what] of FORBIDDEN) {
      if (pattern.test(raw)) { fail(`${dir}/${file} contains ${what}`); clean = false; }
    }
    if (clean) pass(`${dir}/${file} — no instance, credential or contact details`);
  }
}

// ------------------------------------------------------- 3. the fingerprint
const recorder = JSON.parse(readFileSync(join(ROOT, "workflows", "agent-flight-recorder.json"), "utf8"));
const fixture = JSON.parse(readFileSync(join(ROOT, "fixtures", "agent-execution-silent-recovery.json"), "utf8"));
delete fixture._comment;

const code = {};
for (const node of recorder.nodes) {
  if (node.type === "n8n-nodes-base.code" && node.parameters?.jsCode) code[node.name] = node.parameters.jsCode;
}

const CONFIG = { execution_id: "152", apiBase: "https://YOUR-N8N-INSTANCE/api/v1", retryStormThreshold: 3, maxSampleChars: 2000 };

function runNode(name, input) {
  if (!code[name]) throw new Error(`workflow has no Code node named "${name}"`);
  const $input = { first: () => ({ json: input }), all: () => [{ json: input }] };
  const $ = (n) => ({ first: () => ({ json: n === "Config" ? CONFIG : {} }) });
  return new Function("$input", "$", '"use strict";' + code[name])($input, $)[0].json;
}

try {
  const ledger = runNode("Reconstruct Tool Ledger", fixture);
  const reconciled = runNode("Reconcile Claims Against Evidence", ledger);
  const pack = runNode("Seal Evidence Pack", reconciled);

  if (reconciled.tools_called !== 1) fail(`expected 1 tool call, saw ${reconciled.tools_called}`);
  if (reconciled.tools_failed !== 1) fail(`expected the tool call to be judged failed, saw ${reconciled.tools_failed} failed — the ledger is probably reading data.main instead of data.ai_tool`);
  if (pack.verdict !== EXPECTED_VERDICT) fail(`verdict is ${pack.verdict}, expected ${EXPECTED_VERDICT}`);
  if (pack.fingerprint !== EXPECTED_FINGERPRINT) fail(`fingerprint is ${pack.fingerprint}, expected ${EXPECTED_FINGERPRINT} — docs/09 tells readers to expect that value`);

  if (pack.verdict === EXPECTED_VERDICT && pack.fingerprint === EXPECTED_FINGERPRINT) {
    pass(`recorder on the fixture — ${pack.verdict}, ${pack.fingerprint}, ${JSON.parse(pack.findings).map((f) => f.type).join(", ")}`);
  }
} catch (e) {
  fail(`recorder pipeline threw: ${e.message}`);
}

// ---------------------------------------------------------- 4. honest claims
// Three things a reader can be misled by, so all three are gated rather than
// remembered. n8n's own template rules reject a workflow that describes a tool
// it does not contain; the rest is this repo trying not to do the thing it
// criticises.

const VENDORS = ["openai", "anthropic", "claude", "groq", "gemini", "mistral", "slack", "dropbox",
  "notion", "airtable", "postgres", "mysql", "gmail", "google sheets", "telegram", "discord",
  "hubspot", "jira", "stripe", "pinecone", "qdrant", "supabase"];

// Phrases that assert the output describes the real world. Seeded input cannot
// support any of them. This list exists because the miner used to end its brief
// with "it is what 650,000 builders hit this month, sorted", from nine invented
// forum posts.
const FALSE_PROVENANCE = [
  /\b\d[\d,.]*(k|,000)?\s+builders\s+(hit|report|face|run)/i,
  /what\s+\d[\d,.]*\s*(k|,000)?\s+builders/i,
  /\breal (users|customers) (report|say|hit)\b/i,
  /\bobserved (across|in) (the )?(community|production)\b/i,
];

const DISCLAIMS = /(contains no|does not integrate|no connector|seeded example|illustrative|stub)/i;

for (const file of workflowFiles) {
  const wf = JSON.parse(readFileSync(join(ROOT, "workflows", file), "utf8"));
  const sticky = wf.nodes.filter((n) => n.type === "n8n-nodes-base.stickyNote")
    .map((n) => n.parameters?.content ?? "").join("\n");
  const jsCode = wf.nodes.map((n) => n.parameters?.jsCode ?? "").join("\n");
  const types = wf.nodes.map((n) => (n.type ?? "").toLowerCase()).join(" ");
  const nodeNames = wf.nodes.map((n) => n.name).join(" | ");

  // 4a. no runtime output may claim seeded data is a real-world observation
  for (const pattern of FALSE_PROVENANCE) {
    if (pattern.test(jsCode)) fail(`${file} output claims real-world provenance (${pattern}) — its input is seeded`);
  }

  // 4b. a named vendor must be a node, or be explicitly disclaimed
  const callsOut = /httprequest|webhook/.test(types);
  for (const vendor of VENDORS) {
    if (!sticky.toLowerCase().includes(vendor)) continue;
    const isNode = types.replace(/[-_]/g, "").includes(vendor.replace(/ /g, ""));
    if (!isNode && !DISCLAIMS.test(sticky)) {
      fail(`${file} names "${vendor}" but has no such node and no disclaimer — n8n rejects templates that describe tools they do not contain`);
    }
  }

  // 4c. a workflow with no outbound node is running on seeded data, and must say so
  if (!callsOut && !/where this data comes from|seeded|illustrative/i.test(sticky)) {
    fail(`${file} has no outbound node, so its data is seeded, but no sticky note says so`);
  }

  // 4d. a node name must not promise a live call the workflow cannot make
  if (/\b(call|fetch|query) the real\b/i.test(nodeNames) && !/httprequest/.test(types)) {
    fail(`${file} has a node named as a real external call but contains no HTTP Request node`);
  }
  pass(`${file} — claims match contents`);
}

// ------------------------------------------- 5. the cassette actually replays
// Never executed on the instance because it is webhook-triggered, so its logic
// is exercised here instead of being assumed to work.
try {
  const cassette = JSON.parse(readFileSync(join(ROOT, "workflows", "replay-cassette.json"), "utf8"));
  const cCode = {};
  for (const n of cassette.nodes) if (n.parameters?.jsCode) cCode[n.name] = n.parameters.jsCode;

  const request = { body: { model: "gpt-4o-mini", messages: [{ role: "user", content: "extract the invoice number" }], temperature: 0 } };
  const run = (name, input) => {
    const $input = { first: () => ({ json: input }), all: () => [{ json: input }] };
    return new Function("$input", '"use strict";' + cCode[name])($input)[0].json;
  };

  const fp1 = run("Fingerprint The Request", request);
  const fp2 = run("Fingerprint The Request", request);
  if (!fp1.cassette_key) fail("cassette produced no cassette_key");
  else if (fp1.cassette_key !== fp2.cassette_key) fail("cassette key is not stable for an identical request — replay can never hit");
  else pass(`replay-cassette — identical requests hash alike (${fp1.cassette_key})`);

  const miss = run("Stand In For The First Model Call", fp1);
  if (miss?.choices?.[0]?.message?.content === undefined) fail("cassette miss path produced no chat-completion response");
  else if (!/stub/i.test(miss.x_cassette?.note ?? "")) fail("cassette miss path does not declare itself a stub");
  else pass("replay-cassette — miss path returns a chat-completion shape and admits it is stubbed");
} catch (e) {
  fail(`replay-cassette check threw: ${e.message}`);
}

console.log(failures === 0 ? "\nall checks passed" : `\n${failures} check(s) failed`);
process.exit(failures === 0 ? 0 : 1);
