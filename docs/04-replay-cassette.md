# Replay Cassette

**File:** `workflows/replay-cassette.json` · 10 nodes · **live Webhook** · no credentials

This is the only workflow here that genuinely executes rather than models. It is a real HTTP endpoint.

---

## The problem

Every other workflow in this repo has the same unstated dependency: it assumes you can run your evals. In practice
almost nobody does, and the reason is not laziness.

Calling a real model costs money and returns a different answer each time. So an eval suite that runs on every commit
is expensive and flaky, which means it runs weekly instead, which means it runs monthly, which means six months later
nobody trusts it enough to gate a merge on it. The suite has rotted and everyone politely stops mentioning it.

You cannot fix that with discipline. You fix it by making the run free and byte-identical.

## What it does

An OpenAI-compatible endpoint that sits in front of the real provider.

```
POST /webhook/cassette/v1/chat/completions
```

- **First time it sees a request:** calls the real model, answers, and writes the response to the tape.
- **Every time after:** replays the recorded bytes. Zero cost, zero latency, identical output.

Point your AI Agent node at this URL in CI and at the real provider in production. Nothing else in your workflow
changes.

## The fingerprint is the whole trick

The cassette key is a djb2 hash of the **canonical** request:

```js
JSON.stringify({
  model:       b.model,
  temperature: b.temperature,
  tools:       b.tools || null,
  messages:    b.messages
})
```

Model, temperature, tool definitions, and the complete message array. Nothing else — no timestamps, no request IDs, no
correlation headers, because those change on every call and would make every request a cache miss.

Change one word of a prompt and you get a different key, a miss, and a fresh recording. **A prompt edit invalidates its
own tape.** That property is what makes replay safe. Without it, replay is actively dangerous: you would sit there
watching green tests while running a prompt that has not been executed for six weeks.

## The response envelope

Replayed responses carry an `x_cassette` block so a caller can always tell what happened:

```json
"x_cassette": {
  "mode": "REPLAY",
  "key": "cass_1f3a91c2",
  "recorded_at": "2026-08-14T09:12:04Z",
  "cost_cents": 0,
  "saved_cents": 1.8,
  "byte_identical": true
}
```

I care about this more than it probably deserves. A test harness that cannot tell you whether it hit a real model or a
recording is a harness that will eventually lie to you. `mode: REPLAY` versus `mode: RECORD` is two words, and it is
the difference between an artefact you can trust and one you cannot.

## What is stubbed, plainly

The tape is an in-memory object literal inside the Code node with a single seeded entry, and "call the real model"
returns a fixed string rather than making an HTTP request. So the **routing, hashing, cache-hit logic and response
shape are real and execute**; the persistence and the upstream call are not.

To make it production-shaped:

1. Move the tape to a Data Table or Postgres keyed on `cassette_key`, with the recorded body, timestamp and cost.
2. Replace the mock branch with a real HTTP Request node to the provider.
3. Add a TTL and a `--record` mode flag, so a developer can deliberately re-record when a provider changes.
4. Add a tape-coverage report: how many of your eval cases have recordings, and how old the oldest one is. A tape
   nobody has refreshed in a year is its own kind of risk.

That is maybe a day of work. I stopped where I did because the argument was already demonstrable, and shipping a
half-finished Postgres schema would have added nothing to it.

## Why n8n specifically should care

n8n has 650,000+ builders wiring AI nodes together. As far as I can tell, not one of them can currently write a test
that runs the same way twice without paying for it.

Give them this and the entire eval story becomes free to run on every save. That is the difference between "we have
evals" and "our evals gate merges" — and it is the difference between an AI Trust workstream that produces dashboards
and one that produces reliability.

It is also the highest-leverage single thing in this repo, which is why it is the first thing I would build. See
[`05-what-i-would-ship-first.md`](05-what-i-would-ship-first.md).
