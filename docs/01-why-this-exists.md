# Why this exists

## The failure mode nobody has a name for

In safety-regulated software the rule is boring and absolute: a release does not ship without its evidence. Not
"we tested it" — a signed record of what was tested, against which requirement, at which commit, with what result.
It is slow and it is occasionally maddening and it is the reason the thing does not kill anyone.

LLM features are built under the opposite default, and the contrast is uncomfortable.

Ordinary software fails loudly. Wrong type, null pointer, timeout, 500. The failure announces itself and something in
the chain goes red. AI-shaped software has a third state that ordinary software does not have. It can **finish
successfully and be wrong**. The run is green. No node errored. No alert fired. The output is a plausible sentence
containing the wrong invoice number.

Chaos engineering was invented for servers being unavailable. Nobody adapted it for *answers being subtly the wrong
shape*. That is the gap this repo pokes at.

## Three things I believe, roughly in order of confidence

**1. Most AI reliability problems are placement problems, not model problems.**

The most common thing I see is a model doing work that a regex would do exactly. Someone wires an AI Agent node into
"extract the invoice number from this PDF", it works in the demo, and now there is a non-deterministic step in the
middle of an accounting pipeline running four thousand times a day. The model is not broken. It is simply in the wrong
place. No better prompt fixes that; only deleting the step does.

This is why the Determinism Advisor is stage one and not stage six.

**2. Evals that cost money to run do not get run.**

Every team I have watched builds an eval suite, runs it enthusiastically for two weeks, and then stops, because each
run costs real tokens and returns slightly different numbers. Then the suite rots, and six months later nobody trusts
it enough to gate a merge on it.

The fix is not discipline. It is making the run free and byte-identical. That is the entire argument for the Replay
Cassette, and it is the thing I would build first if someone put me on this problem full time.

**3. A quality record that overstates its own coverage is worse than no record.**

This one I am most sure about. If a report says "all tests passing" and the reader believes that means "the system
works in production", the report has done harm. An artefact should carry an explicit scope statement — what it
covers, what it does not, what environment it ran in. A manifest line reading `cloud_resources_created: false` and
`scope: local-only, synthetic, non-production` is worth more than the count of passing tests above it.

## What this is not

It is not a product. It is not production-grade. It is a set of arguments made in the medium of the thing being argued
about.

Node counts are small on purpose. See the note at the bottom of the README, and see
[`06-limitations.md`](06-limitations.md) for the parts I think are weak.
