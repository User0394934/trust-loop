# Workflow layout audit and fix

All eight workflows had sticky note text running underneath the nodes, and boxes that
overlapped each other. This records what was broken, two approaches that were tried and
thrown away, what was actually done, and three n8n behaviours worth knowing about.

## The defect

n8n does not wrap sticky note text around nodes. Text starts at the top of the box and
flows straight down. A section sticky is meant to sit over the row of nodes it labels, so
the text stays readable only while it fits the clear band between the top of the box and
the first node row inside it. Once the text is taller than that band it renders behind the
node icons and both become unreadable.

Measured before the fix:

| defect | count |
|---|---|
| sticky text overflowing its box (30–155px) | 11 |
| box-on-box overlap | 14 |
| box with less than its required slack | 2 |
| **total** | **27** |

After: **0**.

## Two approaches that were wrong

**First: move every node below every sticky.** This guarantees no node sits under any
text. On a single-row workflow it looks fine, and it shipped. On `platform-sentinel`,
which is eight wide bands each sitting over its own row, it left the labels 1,300px above
the graph they describe. The rule already written down here is never to fix an overlap by
pushing a sticky away from the nodes it labels. Pushing the nodes away instead breaks the
same rule from the other side. The rule is about the distance between a label and its
subject, not about which of the two moves.

**Second: treat any overlap as a stacking problem.** Boxes are often laid out side by
side over the same node row, clipping each other by a small horizontal sliver. Resolving
that by pushing one box down turns a tidy row of three into a diagonal staircase. On
`regret-log` it stretched the canvas from 352px to 2032px and stranded one branch of an If
1,800px from its two siblings.

That second version was committed and pushed before it was caught, because the audit only
measures overlaps. Nothing overlapped, so it reported zero defects on a canvas that had
become six times taller and much worse to read. An overlap check is not a layout check.

## What was actually done

`n8n-creator/wf_fix_bands.py`, run over `workflows/`:

1. Snap every position onto n8n's 16px grid, so measurements match what the canvas uses.
2. Give strays a home: a node outside every box is usually the second branch of an If
   whose twin is inside one. Assign it to the box holding most of the nodes it connects
   to, unless that box cannot grow to reach it without hitting a neighbour.
3. Open up each band, **one push per node row**, taking the largest shortfall across every
   box that shares that row so side-by-side boxes do not each push it.
4. Resolve any remaining overlap along whichever axis overlaps less: trim a side-by-side
   sliver, push down only when boxes genuinely stack.
5. Lift any node whose caption would print over a box heading.
6. Re-fit heights, since trimming a box narrows its text and makes it taller.

Steps 3 to 6 feed each other, so they run to a fixed point inside one invocation. Runs 3
and 4 make zero changes.

Only `position`, `width` and `height` changed. Verified by diffing with every geometry key
filtered out, which leaves an empty diff. No prose, node name, connection, credential or
parameter was touched.

| workflow | canvas height before | after the bad fix | now |
|---|---|---|---|
| agent-flight-recorder | 280 | 576 | 576 |
| community-failure-miner | 256 | 1328 | 832 |
| determinism-advisor | 256 | 1200 | 752 |
| platform-sentinel | 1216 | 1952 | 1936 |
| regret-log | 352 | 2032 | 832 |
| replay-cassette | 256 | 1424 | 1152 |
| skill-extractor | 256 | 1200 | 704 |
| trust-ledger | 352 | 1216 | 784 |

The canvases are taller than the originals and that is unavoidable: the prose in these
stickies is 137 to 200 words, and it has to go somewhere other than on top of the nodes.

## Three n8n behaviours worth knowing

**Positions snap to a 16px grid on import. Widths and heights do not.** So a JSON level
check can pass while the rendered canvas overlaps. Two boxes here were exactly touching in
the file, gap 275 against height 275, and came back from n8n as gap 272 against height 275:
a three pixel overlap that existed only on the canvas. The committed files now sit on that
grid, and stacked boxes keep 24px of real separation rather than merely not overlapping.

**Every mechanical push must be a whole grid step.** Pushing by 3px when positions are
grid-aligned gets snapped back, so the next run sees the same shortfall and pushes again,
and the script never converges.

**A node's caption renders below its icon, outside the 100px box the geometry uses.** A
node sitting just above a box can pass every coordinate check and still have its caption
printed across that box's heading. This was caught only by looking at the canvas:
`regret-log`'s `LOWER THE GATE` label sat on top of `The compounding bit`.

## Verification

- `python ../n8n-creator/wf_audit.py workflows` — 0 overlap, overflow or slack findings
- `python ../n8n-creator/wf_fix_bands.py workflows` — 0 changes on a re-run
- `node tests/verify.mjs` — all 28 checks pass, including that no instance, credential or
  contact detail appears in any workflow or fixture
- Imported into a live n8n instance and read back from its API, which is the only way to
  see what the grid snap did: 0 box-on-box, 0 node-on-node, 0 nodes over text, 0 captions
  over headings, 0 off-grid
- Looked at on the canvas, zoomed in, for `regret-log` and `platform-sentinel`
- Executed after the change, reading the output rather than trusting the status field:
  `platform-sentinel` reached **all 29 nodes**, `regret-log` 5 of 7

Where a node was not reached it was checked rather than assumed. `regret-log`'s two
untouched nodes are the other branches of a three-way switch, and only one branch fires per
run. `replay-cassette` is webhook triggered so it waits for a call; its logic is covered by
the suite instead.

## Still open, deliberately

Three nodes remain outside any box: `Merge All Checks` on `platform-sentinel`, which is a
genuine junction fed by seven boxes and belongs to none of them, plus `LOWER THE GATE` on
`regret-log` and `HEALTHY: Publish The Ledger` on `trust-ledger`, where the neighbouring
box is in the way. Down from eight. They are not overlaps, they just look unfinished.

The audit also reports 26 findings against n8n's **template submission** rules: eight
workflows with no yellow overview sticky, and eighteen section stickies over the 50 word
limit, the longest at 200. Those are style rules for templates submitted to n8n's library,
not defects. Here the long stickies are the documentation, and cutting someone's prose to
hit a word count is an editorial decision rather than a mechanical one. Any of these
submitted to the library would need shortened prose and a yellow overview sticky.
