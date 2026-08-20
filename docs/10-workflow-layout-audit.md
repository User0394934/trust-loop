# Workflow layout audit and fix

All eight workflows had sticky notes whose text ran underneath the nodes, and stickies
that overlapped each other. This records what was broken, the approach that was tried and
thrown away, what was actually done, and one n8n behaviour worth knowing about.

## The defect

n8n does not wrap sticky note text around nodes. Text starts at the top of the box and
flows straight down. A section sticky is meant to sit over the row of nodes it labels, so
the text only stays readable while it fits in the clear band between the top of the sticky
and the first node row inside it. Once the text is taller than that band it renders behind
the node icons and both become unreadable.

Measured on `HEAD` before the fix:

| defect | count |
|---|---|
| sticky text overflowing its box (30–155px) | 11 |
| sticky-on-sticky overlap | 14 |
| sticky with less than its required slack | 2 |
| **total** | **27** |

After the fix: **0**.

## The approach that was wrong

The first attempt shifted every node below every sticky, so no node could sit under any
text. On the single-row workflows it looked fine and it nearly shipped.

On `platform-sentinel` it was destructive. That workflow is a column of eight wide section
bands, each sitting over its own row of nodes, which is the layout n8n's own guidelines
ask for. Moving all 29 nodes into one block underneath left a column of labels 1,300px
above the graph they described, pointing at nothing.

This is a known trap seen from the other side. The rule was already written down as *never
fix an overlap by pushing a sticky down, because it separates the sticky from the nodes it
labels*. Pushing the nodes away instead separates them exactly as badly. The rule is about
the distance between a label and its subject, not about which of the two moves.

## What was actually done

`n8n-creator/wf_fix_bands.py`, run over `workflows/`:

1. Snap every position onto n8n's 16px grid, so measurements match what the canvas uses.
2. For each sticky, compare the band it has against the height its text needs. Where the
   text does not fit, push that node row and everything below it down by the shortfall,
   carrying the later stickies along so each band keeps sitting over its own nodes.
3. Grow each sticky so it still covers its own nodes and holds its own text.
4. Separate any stickies left closer than 24px.

Every push is a whole grid step, so the script converges: runs 2 and 3 make zero changes.

Only `position`, `width` and `height` changed. Verified by diffing with every geometry key
filtered out, which leaves an empty diff. No prose, node name, connection, credential or
parameter was touched. The 175-line diff is entirely numbers.

Vertical shift applied per workflow:

| workflow | nodes | stickies | nodes shifted down |
|---|---|---|---|
| agent-flight-recorder | 14 | 3 | 108px |
| community-failure-miner | 7 | 3 | 224px |
| determinism-advisor | 7 | 3 | 160px |
| platform-sentinel | 29 | 8 | 96px |
| regret-log | 7 | 3 | 0px |
| replay-cassette | 7 | 3 | 192px |
| skill-extractor | 7 | 3 | 176px |
| trust-ledger | 7 | 3 | 384px |

## n8n snaps positions to a 16px grid on import

Worth knowing, because it means **a JSON-level audit can pass while the rendered canvas
overlaps**.

Caught on `platform-sentinel`. Two stickies were exactly touching in the file: gap 275,
height 275, overlap 0. After import the gap read 272 while the height stayed 275, a 3px
overlap that existed only on the canvas. Positions are snapped; widths and heights are not.

Two consequences, both now handled:

- Leave real separation between stacked stickies, not merely zero overlap. Rounding can
  move each edge by up to 8px, so two edges can close by up to 16px.
- Keep the committed file on the same grid, so it round-trips through n8n unchanged.

Confirmed by importing `platform-sentinel.json` and reading back what n8n stored:
zero sticky-on-sticky, zero node-on-node, zero nodes over sticky text, zero off-grid.

## Verification

- `python ../n8n-creator/wf_audit.py workflows` — 0 layout, overflow or slack findings
- `python ../n8n-creator/wf_fix_bands.py workflows` — 0 changes on a re-run
- `node tests/verify.mjs` — all 29 checks pass, including that no instance, credential or
  contact detail appears in any workflow or fixture
- Every workflow executed on a live instance after the change, reading the output rather
  than trusting the status field:

| workflow | execution | result |
|---|---|---|
| determinism-advisor | 2.20s | success, REFACTOR branch |
| community-failure-miner | 1.97s | success, roadmap branch |
| regret-log | 526 | success, all 5 nodes |
| skill-extractor | 527 | success, 6 of 7 nodes |
| trust-ledger | 528 | success, 5 of 7 nodes |
| agent-flight-recorder | 529 | success, 11 of 14 nodes |
| platform-sentinel | 530 | success, **29 of 29 nodes** |
| platform-sentinel (post-fix JSON) | 533 | success, 28 of 29 |

`replay-cassette` is webhook-triggered, so it waits for a call rather than running from a
trigger. Its logic is covered by the repo suite instead.

Nodes not reached were checked rather than assumed. On `agent-flight-recorder` the three
untouched nodes are the alternate manual-trigger branch and the live-fetch path, which the
synthetic route bypasses by design. On `platform-sentinel` run 530 wrote its findings, so
run 533 correctly suppressed `Write Findings` as already seen that day. That is the
deduplication working, and the two runs differ only by prior state, not by the JSON.

## What was not verified

The canvas could not be screenshotted at the end. The n8n editor rendered blank in the
browser used here after repeated imports, while the REST API kept returning the full
37-node workflow, so this is a client-side rendering glitch rather than a data problem.
The overlap counts above were therefore measured numerically against the copy n8n stored,
which is more precise than reading a screenshot, but **nobody has looked at the final
canvas with their own eyes.** Worth one glance before trusting it.

## Still open, deliberately

`wf_audit.py` still reports 26 findings against the n8n **template submission** rules:
eight workflows with no yellow overview sticky, and eighteen section stickies over the
50-word limit, the longest at 200 words.

These are left alone on purpose. They are style rules for templates submitted to n8n's
library, not defects. In this repo the long stickies are the documentation, and rewriting
someone's prose to hit a word count is an editorial decision, not a mechanical one. If any
of these workflows is ever submitted to the library, that copy needs the prose shortened
and a yellow overview sticky added.
