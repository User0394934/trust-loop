# Limitations

Read this second. If I were reviewing someone else's portfolio repo, this is the file I would look for and be
suspicious if it were missing.

---

## The big one: five of six workflows have seeded input

Only **Replay Cassette** is a live endpoint that takes a real request and produces a real response. The other five run
end to end — the logic executes, the branching is real, the scoring is real arithmetic on real inputs — but the *inputs*
are declared in a Code node rather than read from a system.

So `skill-extractor.json` does not read your workflow corpus. It reads nine hand-written build records and then does
genuine sub-sequence analysis on them. `trust-ledger.json` does not read execution telemetry. It reads four hand-written
template records and then computes a genuine weighted score with a genuine cap.

**Why I built them that way.** I wanted them importable and runnable by a stranger on a fresh n8n instance with no
credentials, no database, and no API keys. Every alternative required somebody to configure something before they could
see the idea. That trade was deliberate and I would make it again for a portfolio.

**Why you should still hold it against me.** A workflow with seeded input is an executable specification, not a working
system. It proves I can define the logic and defend the design. It does not prove I can wire it to production data,
handle the volume, or deal with the mess real telemetry contains. Those are different skills and this repo does not
demonstrate them.

If a workflow here looks like it is testing something and you find a hardcoded lookup table, that is not me hiding
it — it is this paragraph.

## Six workflows are described but not exported

The Non-Determinism Fuzzer, The Airlock, Blast Radius Preflight, Silent Success Detector, Agent Intent Drift,
Compensating Rollback, Data Lineage Tracer, MCP Tool Poisoning Guard and Context Budget Compiler exist in my n8n
instance. They are earlier drafts, they are less carefully reasoned than these six, and several have the seeded-input
problem in a worse form — the fuzzer in particular contains a fixed table of "how the system reacted" rather than
actually injecting anything.

I would rather show six things I stand behind than fifteen I half-do. But I am naming them so that "there are eighteen
workflows" cannot be read as "there are eighteen workflows of this quality." There are six.

## The scoring formulas are opinions with arithmetic on top

Trust Ledger weights eval pass rate at 30%, fuzz survival and injection resistance at 20% each, and cost variance,
freshness and incidents at 10% each. Those numbers came from my judgement about what matters, not from data about what
predicts failure. Same for Community Failure Miner's pressure formula and its 1.5× multiplier per additional source.

They are defensible starting points and they are calibratable — you would tune them against actual incident data within
a quarter. But nobody should mistake a weighted sum for a measurement, and a scoring system that presents its opinions
as objective is precisely the sort of overstated quality record I complain about elsewhere in this repo.

## No tests

There are no tests for these workflows, which is uncomfortable in a repo about testing.

The honest reason: n8n workflows are hard to unit-test without exactly the kind of deterministic harness that
`replay-cassette.json` is proposing. The circularity is not lost on me. If I were doing this properly I would use the
Cassette to test the others, and that would be a good demonstration of the point. I ran out of evening.

## What I would fix, in order

1. Wire the Eval Harness to the Replay Cassette so at least one loop runs genuinely end to end at zero cost. Half a day.
2. Give Replay Cassette real persistence and a real upstream HTTP call. A day.
3. Replace Trust Ledger's seeded template records with real n8n execution telemetry — which requires access I do not
   have, so this one is a proposal rather than a task.
4. Rebuild the Non-Determinism Fuzzer so it actually injects faults into a sub-workflow via Execute Sub-workflow,
   instead of consulting a table of outcomes. That one is a genuine defect, not a scoping decision, and it is the first
   thing I would fix if I were keeping the other twelve.

## What this repo is evidence of, and what it is not

**It is evidence of:** design judgement about AI reliability, an ability to define what "working" means for a
non-deterministic system, prioritisation with the reasoning shown, and a habit of declaring the scope of my own
artefacts.

**It is not evidence of:** shipping an AI product to production users, operating at scale, working with real
telemetry, or managing a team. I have not done those things and this repo does not pretend I have.
