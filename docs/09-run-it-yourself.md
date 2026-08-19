# 09. Run it yourself

Every other document in this repo asks you to take my word for something. This one does not.

Until today the two workflows these documents are actually about — the Sentinel and the Recorder —
could not be run by anyone but me. They needed an API credential, four Data Tables whose columns were
written down nowhere, and, in the Recorder's case, a real agent execution sitting in my instance. The
prose was checkable; the artefacts were not. That is a bad shape for a repo whose entire argument is
that unverifiable claims should not be trusted.

---

## The Agent Flight Recorder now runs on nothing

Import [`workflows/agent-flight-recorder.json`](../workflows/agent-flight-recorder.json) and press
Execute. No credential, no Data Table, no API, no agent of your own.

It ships with `useSyntheticData` set to **true** in the Config node. That routes the run through
`Synthetic Execution Record`, a Code node holding an invented n8n execution record — the same content
as [`fixtures/agent-execution-silent-recovery.json`](../fixtures/agent-execution-silent-recovery.json).
No instance, no credentials, no real customer appears in it.

You should get exactly this:

```
Agent Flight Recorder: SUSPECT
Coverage: full record for 1 tool call(s)
Fingerprint: a834ed58f0de4b1e

- [HIGH] SILENT_RECOVERY: a tool did not succeed (ToolGetOrderStatus returned
  "No Orders found for customer id :  ") but the agent answer never mentions any
  failure or missing data. The agent wrote around a broken step, which reads to
  the user exactly like success.
```

**The fingerprint is the point.** It is a deterministic hash of the ledger, the claims and the
findings. The fixture is fixed, so the hash is fixed. If you get `a834ed58f0de4b1e`, your run
reconstructed byte-for-byte what mine did. If you get anything else, one of us is wrong and the
difference is inspectable. That is a stronger claim than a screenshot, and it is the reason this
document exists.

### What the fixture reproduces

A customer service agent is asked about order 1001. Its lookup tool returns **HTTP 200** with a body
of `{"error": "No Orders found for customer id :  "}` — note the empty id. n8n marks the node
successful, because it was: the request completed. The agent then replies *"Sure thing! Could you
please confirm the exact order number…"* and never mentions that anything failed.

Green tick, helpful-sounding answer, and a customer who now believes they mistyped their own order
number. That is the failure this whole repo is about, in fourteen lines of JSON.

---

## The same fixture, against the previous version

Until this commit, the JSON published here was the *first* version of the ledger builder. Running both
versions against the identical fixture:

| | verdict | tools_ok | tools_failed | findings | fingerprint |
|---|---|---|---|---|---|
| **v1** (what this repo shipped until now) | `CLEAN` | 1 | 0 | none | `63b2421dc266e863` |
| **v2** (what is here now) | `SUSPECT` | 0 | 1 | `SILENT_RECOVERY` HIGH | `a834ed58f0de4b1e` |

Same input. Opposite conclusions. v1 read tool output from `data.main`, but an n8n agent's tool writes
to `data.ai_tool`, so v1 saw an empty result and — because it also decided success by reading n8n's
node status rather than the payload — recorded a completely failed tool call as healthy. The full
story is Part 5 of [`08-agent-flight-recorder.md`](08-agent-flight-recorder.md).

Two things follow, and the second one I did not expect:

1. **The documented catch was not reproducible from the published artefact** until now. The document
   described v2 while the folder shipped v1. Nobody would have found that by reading; you find it by
   running it, which nobody could.
2. **The fingerprint is sensitive, not just reproducible.** `08` was careful to say that two identical
   runs producing one hash proves stability but not that a *changed* ledger produces a *different*
   hash. Two versions, two ledgers, two clearly different hashes. That is one data point rather than a
   tamper-evidence proof, but it is no longer an untested assumption.

---

## Running the Recorder against your own agent

Set `useSyntheticData` to **false** in Config. Then it needs:

- **An n8n API credential** on `Fetch Execution Record`, and your instance URL in `apiBase`
  (replace `https://YOUR-N8N-INSTANCE/api/v1`).
- **A Data Table named `recorder_evidence_packs`:**

  | column | type |
  |---|---|
  | `pack_key`, `execution_id`, `workflow_id`, `verdict`, `fingerprint` | string |
  | `coverage`, `findings`, `recorded_at` | string |
  | `tools_called`, `claims_made`, `claims_unsupported` | number |

- **An execution id** of a finished agent run, in `Demo Execution Id` or passed in by a caller.
- Optionally a Discord webhook credential on `Send Recorder Alert`. Without one the run still
  completes and still stores the pack; only the notification is skipped.

---

## The Platform Sentinel needs a real instance, and always will

I am not going to ship a synthetic mode for the Sentinel, because it would be a lie. The Sentinel
audits *your* platform through its own Public API — silent triggers, hung executions, error spikes,
retention, credential drift. Feed it invented data and it audits nothing while displaying a status,
which is precisely the failure Part 3 of [`07-platform-sentinel.md`](07-platform-sentinel.md) is about.
A demo mode here would be the false GREEN wearing a costume.

What it needs to run for real:

- **An n8n API credential** on the six fetch nodes, and your instance URL in `apiBase`.
- **`sentinel_findings`** — `finding_key`, `finding_type`, `severity`, `workflow_id`, `detail`,
  `detected_at`, `owner`, all string.
- **`sentinel_trigger_registry`** — `workflow_id`, `workflow_name`, `owner` as string,
  `expected_interval_minutes` as number. Seed it with the workflows that matter to you; leave it empty
  and check 1 reports `REGISTRY_EMPTY` rather than pretending to have looked.
- **`sentinel_api_probes`** — `probe_name`, `vendor`, `url`, `method` as string, `expected_status` as
  number. Empty gives you `PROBES_EMPTY`, again by design.
- Optionally a Discord webhook on `Send Consolidated Alert`.

**One disclosure.** My own instance has since moved to a registry with an `expected_outcome` column,
a three-value model separating workflows that must succeed on a schedule from ones that only run on
demand and ones designed to fail. The version published here does **not** implement that; it is the
simpler interval-based check, and the schema above is the one its code actually reads. I would rather
say that than quietly ship a table name whose documented columns the workflow ignores.

Also worth knowing before you wire it to a channel: the alerting has no state, so while something is
failing it will send the same message every fifteen minutes and say nothing at all when it recovers.
That is Part 8 of `07`, and it is not fixed yet.

---

## The other six

`determinism-advisor`, `replay-cassette`, `trust-ledger`, `regret-log`, `skill-extractor` and
`community-failure-miner` have always run standalone — their input is seeded in Code nodes and none
of them calls a paid API. `replay-cassette` is the only one needing anything special: it is a webhook,
so activate it or use the Test URL.
