# Determinism Advisor

**File:** `workflows/determinism-advisor.json` · 10 nodes · Manual Trigger · no credentials

This is the one I would defend hardest, and the only workflow here that argues a product should do less.

---

## The problem

n8n's own AI Product Manager posting opens with this:

> Not everything should be automated. Not everything should be agentic. The magic is knowing what belongs where.

I agree completely, and that is why it bothered me. Nothing in the product helps anyone decide, as far as I have
found. You open a canvas, you drag in an AI Agent node, and there is no moment where the tool asks whether that
step needed a model. So people put one in "extract the invoice number from this PDF", it works in the demo, and
now there is a non-deterministic step in the middle of an accounting pipeline.

The interesting failure is not that the AI got something wrong. It is that **AI was used where a regex would have been
exact** — four thousand times a day, at 1.8 cents a call.

## What it does

It reads a workflow step by step and gives each step a verdict: `DETERMINISTIC`, `AGENTIC`, or `HUMAN`. Then it prices
the disagreements.

Three rules, applied in this order, because the order matters:

```
1. not reversible AND blast_radius == high        -> HUMAN
2. needs_judgement AND output_shape == open       -> AGENTIC
3. otherwise                                     -> DETERMINISTIC
```

Rule 1 comes first because safety beats capability. A step that cannot be undone and can do real damage should stop for
a person even if a model could technically handle it. Judgement is cheap; an unrecoverable mistake is not.

Rule 2 is the only case where a model earns its place: the input is unstructured and the output genuinely requires
judgement. That is what models are for and it is a much narrower set than people assume.

Rule 3 is the default, and defaults matter. Deterministic is the default because determinism is free and variance is not.

## The sample it ships with

Six steps from a plausible invoice-triage workflow. Four of them are in the wrong place:

| Step | Currently | Belongs | Why |
|---|---|---|---|
| Extract invoice number from PDF | agentic | **deterministic** | Fixed output shape, no judgement. 4,000 runs/day at 1.8c |
| Decide if this invoice looks fraudulent | deterministic | **agentic** | Open-ended judgement over messy input — hard rules will miss |
| Write the refusal email to the supplier | agentic | **human** | Irreversible, high blast radius. You cannot unsend it |
| Convert currency using today's ECB rate | agentic | **deterministic** | There is an API with one right answer |
| Post the payment to the ledger | agentic | **human** | Irreversible and financial |
| Summarise the month for the finance lead | agentic | agentic | Correct as-is |

Note that the errors go in **both** directions. Two steps use a model where code would be exact. One uses hard-coded
rules where the input is genuinely open-ended. Two are irreversible and should never have been automated at all. Only
one of six was correctly placed, and that ratio is not pessimism — it is roughly what I see in real workflows.

## What I would change if this were real

The rules are heuristics on hand-supplied metadata, which is the honest weakness. `blast_radius` and `needs_judgement`
are currently declared, not detected. In a real version:

- `blast_radius` is derivable from the node type. A Gmail node, an HTTP POST to a payments API, and a database DELETE
  are high by construction. A Set node is not.
- `reversible` is mostly derivable too — writes to external systems are not reversible, reads are.
- `runs_per_day` and `cent_cost` come free from execution history. n8n already has both.
- `output_shape` can be inferred from whether an output parser is attached with a schema.
- `needs_judgement` is the genuinely hard one and probably needs the model to assess the prompt itself. I would ship
  the other five signals first and leave this one as a user declaration, because a wrong automatic answer here is worse
  than an honest question.

That is the shape of the real feature: five signals free from data n8n already stores, one asked once, and a
recommendation the user can override. The override is important — if the tool is confidently wrong and cannot be
argued with, people stop reading it.

## The metric I would hold myself to

Not "recommendations generated". That measures nothing.

**Share of AI Agent nodes that get removed within 30 days of a recommendation.** If people read the advice and change
nothing, the feature has failed regardless of how many verdicts it produced. And I would watch the inverse too — steps
promoted *to* agentic after being flagged as under-agentic — because a tool that only ever says "use less AI" is a
scold, not an advisor.

## Why this belongs in the product rather than in a blog post

Because the data is already there. Node types, execution counts, token costs, output parsers, external write
operations — n8n sees all of it and currently throws away the inference. Nobody outside the platform can compute this,
which is the definition of a feature that belongs inside.

And it is the cheapest reliability win available to anyone: not a better model, not a better prompt. **Less surface
area.**
