# The Trust Loop

Eight stages an AI automation should pass before anyone depends on it, built as importable n8n workflows.

It started as a single workflow and turned into something I actually wanted to argue about, so I wrote it
down properly.

---

## The problem I kept running into

Regulated software and LLM features are built under opposite defaults. In one, nothing ships without its evidence.
In the other, the feature ships and the evidence is optional. Putting the two side by side makes one thing obvious.

When a normal piece of software breaks, it stops. You get a stack trace, a red build, a 500. When an AI workflow
breaks, it very often **succeeds** — green tick, no error, output that is quietly wrong. Nobody has a category for
that, so nobody tests for it, so the first time it happens is in production on somebody's real invoice.

Everything here is aimed at that gap. Not "does the model work" — that question is easy and mostly answered. The
question is *"can I show that it worked, and would I notice if it stopped?"*

## The eight stages

| Stage | The question it answers | Workflows here |
|---|---|---|
| 1. Decide | Should this even be an agent? | **Determinism Advisor** |
| 2. Build | What should the platform offer before I ask for it? | **Skill Extractor** |
| 3. Prove | Does it do the job, repeatably, without costing money to check? | **Replay Cassette** |
| 4. Attack | What happens when the input is hostile or the world is broken? | Non-Determinism Fuzzer |
| 5. Ship | Is it safe to let this out? | The Airlock, Blast Radius Preflight |
| 6. Run | Is it still doing the job today? | Silent Success Detector, Agent Intent Drift |
| 7. Recover | It went wrong. Can we undo it and explain it? | Compensating Rollback |
| 8. Learn | What did we learn, and who else should benefit? | **Regret Log**, **Trust Ledger**, **Community Failure Miner** |

Stage 8 is what makes it a loop rather than a checklist, and it is the stage almost nobody builds. Draw it as a
circle, not a pipeline.

The six workflows in **bold** are in `workflows/` as importable JSON. The rest exist in my n8n instance and are
described in the docs; I have not exported them because they are earlier drafts and I would rather show you six things
I stand behind than twelve I half-do.

## Start here

If you only open one file, open [`docs/03-determinism-advisor.md`](docs/03-determinism-advisor.md). It is the one I
would defend hardest, and it is the only workflow here that argues a product should do *less*.

If you want to see something that actually executes rather than models, open
[`docs/04-replay-cassette.md`](docs/04-replay-cassette.md). That one is a live webhook.

If you want to know what I think is wrong with this repo, open
[`docs/06-limitations.md`](docs/06-limitations.md). I would read that one second.

## How to run these

1. In n8n, go to **Workflows → Import from File** and pick any JSON in `workflows/`.
2. Every workflow runs on a **Manual Trigger** or a **Schedule Trigger**, with one exception: Replay Cassette uses a
   **Webhook**, so you need to activate it or use Test URL.
3. **No credentials are required.** Nothing here calls a paid API. Input data is seeded in Code nodes so the graph runs
   end to end on a fresh instance with nothing configured. That is deliberate, and it is also the biggest honest
   limitation — see `docs/06-limitations.md`.
4. Read the sticky notes. They carry the reasoning, not just the labels.

## Repository layout

```
docs/
  01-why-this-exists.md          the thesis, in one page
  02-the-eight-stages.md         the architecture and why it is a loop
  03-determinism-advisor.md      deep dive on the flagship
  04-replay-cassette.md          deep dive on the one that really runs
  05-what-i-would-ship-first.md  prioritisation, with the reasoning shown
  06-limitations.md              what is stubbed, what I would fix, in what order
workflows/
  determinism-advisor.json       10 nodes
  replay-cassette.json           10 nodes, live webhook
  skill-extractor.json           10 nodes
  regret-log.json                10 nodes
  trust-ledger.json              10 nodes
  community-failure-miner.json   10 nodes
```

## A note on size

Every workflow here is ten nodes. That is on purpose and I expect to be asked about it.

I could have built one sprawling sixty-node monster and it would have looked more impressive in a screenshot. It would
also have contradicted the first thing this repo argues, which is that the cheapest reliability win available to
anyone is **less surface area**. A ten-node workflow that a stranger can read without me standing next to it is worth
more than a sixty-node one that only I can maintain — and if I am wrong about that, then the Determinism Advisor is
wrong too, and I would rather find that out in a conversation than hide it behind node count.


## Licence

MIT. Take any of it.
