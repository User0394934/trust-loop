# Contributing

This is a small opinionated repo rather than a product, so the useful contributions are probably not
the ones you would expect.

## What is most welcome

**Tell me where the argument is wrong.** The documents make claims about how n8n behaves, what the
open issues imply, and what an AI agent can and cannot prove about itself. If one of those is out of
date or simply mistaken, an issue saying so is worth more than a pull request. Several of the linked
n8n issues will eventually be fixed, and when they are, parts of `docs/08` stop being true.

**Run the recorder and tell me if your fingerprint differs.** `docs/09` says importing
`workflows/agent-flight-recorder.json` and pressing Execute should give `SUSPECT` with fingerprint
`a834ed58f0de4b1e`. If yours differs, that is a real finding — either a bug here or a difference in
your n8n version — and I would like to know which.

**A detector that fires in anger.** Several of the recorder's detectors have never triggered on
anything but a test. `FABRICATED_ACTION`, `INJECTION_ECHO` and `DUPLICATE_SIDE_EFFECT` are hypotheses
until something real sets them off. A fixture that trips one honestly is a genuine contribution.

## What to expect from me

Slow. This is not staffed. Issues will be read; pull requests may sit.

## If you do open a pull request

- **`node tests/verify.mjs` must pass.** It checks that every workflow is importable-shaped, that
  nothing in `workflows/` or `fixtures/` names a person, instance or credential, and that the recorder
  still produces the fingerprint the documentation quotes. CI runs the same command.
- **Do not add credentials, hostnames, emails or real customer data**, including in fixtures. Fixtures
  are invented on purpose. The test will catch the obvious cases; it will not catch a clever one.
- **Keep workflows small.** Six of these are ten nodes and that is an argument, not an accident — see
  the note at the end of the README. A sixty-node contribution will get a question rather than a merge.
- **If you change a workflow's behaviour, change the document that describes it in the same commit.**
  This repo has already shipped a workflow that its own documentation called broken. That is the exact
  failure the whole thing is about, and it happened here, twice. See `docs/09`.
- Sticky notes carry reasoning, not labels. If you add a node, say why it exists.

## Style

Plain English, no marketing voice, and claims that are checkable. If something has not been tested,
the correct thing to write is that it has not been tested.
